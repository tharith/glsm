<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">User Management</h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
          គ្រប់គ្រងប្រវត្តិរូបមន្ត្រីរាជការ
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add User</v-btn>
    </div>

    <!-- Search -->
    <v-card rounded="xl" elevation="1" class="pa-4 mb-4">
      <v-text-field v-model="search" label="Search name, email or employee ID..."
        prepend-inner-icon="mdi-magnify" density="compact" hide-details clearable
        @update:model-value="debounceLoad"/>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48"/>
    </div>

    <!-- Grid -->
    <v-row v-else>
      <v-col v-for="user in users" :key="user.id" cols="12" sm="6" md="4">
        <v-card rounded="xl" elevation="1" class="pa-4">
          <!-- Avatar + Actions -->
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="d-flex align-center ga-3">
              <v-avatar size="56" :color="roleColor(user.userRoles?.[0]?.role?.name)">
                <v-img v-if="user.photo || user.avatarUrl" :src="apiBase + (user.photo || user.avatarUrl)" cover/>
                <span v-else class="text-body-1 font-weight-bold text-white">{{ initials(user) }}</span>
              </v-avatar>
              <div>
                <div class="text-subtitle-2 font-weight-bold">
                  {{ user.firstName }} {{ user.lastName }}
                </div>
                <div class="text-caption" style="font-family:'Kantumruy Pro',sans-serif">
                  {{ user.firstNameKh }} {{ user.lastNameKh }}
                </div>
                <div class="text-caption text-medium-emphasis">{{ user.employeeId }}</div>
              </div>
            </div>
            <v-chip :color="user.isActive ? 'success' : 'error'" size="x-small" variant="tonal">
              {{ user.isActive ? 'Active' : 'Inactive' }}
            </v-chip>
          </div>

          <v-divider class="mb-3"/>

          <div class="text-caption text-medium-emphasis mb-1">
            <v-icon size="12" class="mr-1">mdi-email-outline</v-icon>{{ user.email }}
          </div>
          <div class="text-caption text-medium-emphasis mb-1">
            <v-icon size="12" class="mr-1">mdi-briefcase-outline</v-icon>
            {{ user.position?.nameEn || '—' }}
            <span v-if="user.currentRankAndGrade" class="ml-1 text-primary">({{ user.currentRankAndGrade }})</span>
          </div>
          <div class="text-caption text-medium-emphasis mb-1">
            <v-icon size="12" class="mr-1">mdi-domain</v-icon>{{ user.orgUnit?.nameEn || '—' }}
          </div>
          <div v-if="user.hireDate" class="text-caption text-medium-emphasis mb-3">
            <v-icon size="12" class="mr-1">mdi-calendar-start</v-icon>
            Hired: {{ formatDate(user.hireDate) }}
          </div>

          <div class="d-flex flex-wrap ga-1 mb-3">
            <v-chip v-for="ur in user.userRoles" :key="ur.role.id"
              size="x-small" :color="roleColor(ur.role.name)" variant="tonal">
              {{ ur.role.name.replace(/_/g,' ') }}
            </v-chip>
          </div>

          <!-- Actions -->
          <div class="d-flex ga-2">
            <v-btn size="small" variant="tonal" color="primary"
              @click="openEdit(user)" prepend-icon="mdi-pencil">Edit</v-btn>
            <v-btn size="small" variant="tonal" color="info"
              @click="openAvatarDialog(user)" prepend-icon="mdi-camera">Photo</v-btn>
            <v-btn size="small" variant="tonal" color="secondary"
              @click="openProfile(user)" prepend-icon="mdi-eye">Profile</v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <div v-if="total > 12" class="d-flex justify-center mt-4">
      <v-pagination v-model="page" :length="Math.ceil(total/12)" rounded="lg"
        @update:model-value="load"/>
    </div>

    <!-- ── CREATE/EDIT DIALOG ── (Tabbed for all new fields) ── -->
    <v-dialog v-model="dialog" max-width="780" scrollable>
      <v-card rounded="xl">
        <v-card-title class="pa-5 pb-0">
          <div class="text-subtitle-1 font-weight-bold">
            {{ editItem ? 'Edit User Profile' : 'Create New User' }}
          </div>
          <div class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
            {{ editItem ? 'កែប្រែប្រវត្តិរូប' : 'បង្កើតបញ្ជីមន្ត្រី' }}
          </div>
        </v-card-title>

        <v-tabs v-model="formTab" class="px-5 mt-3">
          <v-tab value="basic">👤 Basic</v-tab>
          <v-tab value="work">💼 Work Info</v-tab>
          <v-tab value="education">🎓 Education</v-tab>
          <v-tab value="family">👨‍👩‍👧 Family</v-tab>
        </v-tabs>

        <v-card-text class="pa-5">
          <v-form ref="formRef" v-model="isValid">
            <v-window v-model="formTab">

              <!-- TAB 1: BASIC -->
              <v-window-item value="basic">
                <v-row dense>
                  <v-col cols="6">
                    <v-text-field v-model="form.employeeId" label="Employee ID"
                      :disabled="!!editItem" hint="e.g. MOI-001" persistent-hint/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.email" label="Email *"
                      :rules="[r=>!!r||'Required']" type="email" :disabled="!!editItem"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.firstName" label="First Name (EN)"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.lastName"  label="Last Name (EN)"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.firstNameKh" label="ឈ្មោះ (ខ្មែរ)"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.lastNameKh"  label="នាម (ខ្មែរ)"/>
                  </v-col>
                  <v-col cols="6" v-if="!editItem">
                    <v-text-field v-model="form.password" label="Password *" type="password"
                      :rules="[r=>r?.length>=8||'Min 8 chars']"/>
                  </v-col>
                  <v-col cols="6">
                    <v-select v-model="form.gender" label="Gender"
                      :items="[{title:'Male — ប្រុស',value:'Male'},{title:'Female — ស្រី',value:'Female'}]" clearable/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.dateOfBirth" label="Date of Birth" type="date"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.dop" label="Place of Birth — ទីកន្លែងកំណើត"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.nationalId" label="National ID"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.passportNumber" label="Passport Number"/>
                  </v-col>
                  <v-col cols="12">
                    <v-text-field v-model="form.phone" label="Phone" prepend-inner-icon="mdi-phone"/>
                  </v-col>
                  <v-col cols="12">
                    <v-textarea v-model="form.address" label="Address — អាសយដ្ឋាន" rows="2"/>
                  </v-col>
                  <v-col cols="6">
                    <v-autocomplete v-model="form.positionId" label="Position"
                      :items="positions" item-title="nameEn" item-value="id" clearable/>
                  </v-col>
                  <v-col cols="6">
                    <v-autocomplete v-model="form.orgUnitId" label="Org Unit"
                      :items="orgUnits" item-title="nameEn" item-value="id" clearable/>
                  </v-col>
                  <v-col cols="12" v-if="editItem">
                    <v-switch v-model="form.isActive" label="Active" color="success" hide-details/>
                  </v-col>
                </v-row>
              </v-window-item>

              <!-- TAB 2: WORK INFO -->
              <v-window-item value="work">
                <v-row dense>
                  <v-col cols="6">
                    <v-text-field v-model="form.hireDate" label="Hire Date — ថ្ងៃចូលធ្វើការ" type="date"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.dateOfPermanentAppointment"
                      label="Permanent Appointment — ថ្ងៃតាំងស៊ប់" type="date"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model.number="form.workExperience"
                      label="Work Experience (years) — អតីតភាពការងារ" type="number" min="0" max="50"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.currentRankAndGrade"
                      label="Current Rank & Grade — ឋានន្តរសក្កិ"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.dateOfLastPromotion"
                      label="Last Promotion — ថ្ងៃដំឡើងចុងក្រោយ" type="date"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.medalAwarded"
                      label="Medal Awarded — គ្រឿងឥស្សរិយយស"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.dateOfAward"
                      label="Date of Award — ថ្ងៃបង្កើតឥស្សរិយយស" type="date"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.signatureOfApplicant"
                      label="Signature ID — អត្ថលេខ"/>
                  </v-col>
                </v-row>
              </v-window-item>

              <!-- TAB 3: EDUCATION -->
              <v-window-item value="education">
                <v-row dense>
                  <v-col cols="12">
                    <v-select v-model="form.educationLevel"
                      label="Education Level — កម្រិតសញ្ញាបត្រ"
                      :items="[
                        'Primary School — បឋមសិក្សា',
                        'Secondary School — មធ្យមសិក្សា',
                        'High School — វិទ្យាល័យ',
                        'Bachelor\'s Degree — បរិញ្ញាបត្រ',
                        'Master\'s Degree — អនុបណ្ឌិត',
                        'Doctoral Degree — បណ្ឌិត',
                        'Other — ផ្សេងៗ',
                      ]" clearable/>
                  </v-col>
                  <v-col cols="12">
                    <v-text-field v-model="form.foreignLanguages"
                      label="Foreign Languages — ភាសាបរទេស"
                      hint="e.g. English (B2), French (A1)" persistent-hint/>
                  </v-col>
                </v-row>
              </v-window-item>

              <!-- TAB 4: FAMILY -->
              <v-window-item value="family">
                <v-row dense>
                  <!-- Spouse -->
                  <v-col cols="12">
                    <div class="text-caption font-weight-bold text-primary mb-2">
                      💍 SPOUSE — ប្ដីឬប្រពន្ធ
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.nameOfSpouse"
                      label="Spouse Name — ឈ្មោះប្ដីឬប្រពន្ធ"/>
                  </v-col>
                  <v-col cols="6">
                    <v-text-field v-model="form.occupationOfSpouse"
                      label="Spouse Occupation — មុខរបរ"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.workplaceOfSpouse"
                      label="Workplace ID — ទីកន្លែងធ្វើការ" type="number"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model.number="form.numberOfChildren"
                      label="Children — ចំនួនកូន" type="number" min="0"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model.number="form.numbersOfSiblings"
                      label="Siblings — ចំនួនបងប្អូន" type="number" min="0"/>
                  </v-col>

                  <!-- Father -->
                  <v-col cols="12" class="mt-3">
                    <div class="text-caption font-weight-bold text-primary mb-2">
                      👨 FATHER — ឪពុក
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.fathersName" label="Father's Name — ឈ្មោះ"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.dopOfFathers" label="Place of Birth — ទីកន្លែងកំណើត"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.fathersOccupation" label="Occupation — មុខរបរ"/>
                  </v-col>

                  <!-- Mother -->
                  <v-col cols="12" class="mt-3">
                    <div class="text-caption font-weight-bold text-primary mb-2">
                      👩 MOTHER — ម្ដាយ
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.mothersName" label="Mother's Name — ឈ្មោះ"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.dopOfMothers" label="Place of Birth — ទីកន្លែងកំណើត"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.mothersOccupation" label="Occupation — មុខរបរ"/>
                  </v-col>

                  <!-- Father-in-Law -->
                  <v-col cols="12" class="mt-3">
                    <div class="text-caption font-weight-bold text-primary mb-2">
                      👨 FATHER-IN-LAW — ឪពុកក្មេក
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.fathersInLawName" label="Name — ឈ្មោះ"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.dopOfFathersInLaw" label="Place of Birth — ទីកន្លែងកំណើត"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.fathersInLawOccupation" label="Occupation — មុខរបរ"/>
                  </v-col>

                  <!-- Mother-in-Law -->
                  <v-col cols="12" class="mt-3">
                    <div class="text-caption font-weight-bold text-primary mb-2">
                      👩 MOTHER-IN-LAW — ម្ដាយក្មេក
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.mothersInLawName" label="Name — ឈ្មោះ"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.dopOfMothersInLaw" label="Place of Birth — ទីកន្លែងកំណើត"/>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field v-model="form.mothersInLawOccupation" label="Occupation — មុខរបរ"/>
                  </v-col>
                </v-row>
              </v-window-item>
            </v-window>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-5 pt-0 ga-2">
          <v-btn variant="outlined" @click="dialog=false" :disabled="saving">Cancel</v-btn>
          <v-spacer/>
          <v-btn color="primary" @click="save" :loading="saving" :disabled="!isValid">
            {{ editItem ? 'Update' : 'Create User' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- AVATAR DIALOG -->
    <v-dialog v-model="avatarDialog" max-width="400">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="pa-4 pb-2 font-weight-bold">
          Upload Profile Photo
          <div class="text-caption text-medium-emphasis font-weight-regular">
            {{ avatarTarget?.firstName }} {{ avatarTarget?.lastName }}
          </div>
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="text-center mb-4">
            <v-avatar size="96" :color="roleColor(avatarTarget?.userRoles?.[0]?.role?.name)">
              <v-img v-if="avatarPreview" :src="avatarPreview" cover/>
              <v-img v-else-if="avatarTarget?.photo || avatarTarget?.avatarUrl"
                :src="apiBase + (avatarTarget?.photo || avatarTarget?.avatarUrl)" cover/>
              <span v-else class="text-h6 text-white">
                {{ avatarTarget ? initials(avatarTarget) : '?' }}
              </span>
            </v-avatar>
          </div>
          <v-file-input v-model="avatarFile" label="Choose photo"
            accept="image/jpeg,image/png,image/webp" prepend-icon="mdi-camera"
            show-size @update:model-value="previewAvatar"/>
          <v-alert type="info" density="compact" variant="tonal" class="mt-2">
            JPG, PNG or WEBP · Max 5MB
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 ga-2">
          <v-btn variant="outlined" @click="avatarDialog=false" :disabled="saving">Cancel</v-btn>
          <v-btn v-if="avatarTarget?.photo || avatarTarget?.avatarUrl"
            color="error" variant="text" @click="removeAvatar" :loading="saving">
            Remove
          </v-btn>
          <v-spacer/>
          <v-btn color="primary" @click="uploadAvatar" :loading="saving" :disabled="!avatarFile?.length">
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- PROFILE VIEW DIALOG -->
    <v-dialog v-model="profileDialog" max-width="600" scrollable>
      <v-card rounded="xl" v-if="profileUser">
        <v-card-title class="pa-0">
          <div class="pa-6" style="background:linear-gradient(135deg,#1A2744,#0369A1)">
            <div class="d-flex align-center ga-4">
              <v-avatar size="72">
                <v-img v-if="profileUser.photo || profileUser.avatarUrl"
                  :src="apiBase + (profileUser.photo || profileUser.avatarUrl)" cover/>
                <span v-else class="text-h5 text-white">{{ initials(profileUser) }}</span>
              </v-avatar>
              <div class="text-white">
                <div class="text-h6 font-weight-bold">
                  {{ profileUser.firstName }} {{ profileUser.lastName }}
                </div>
                <div style="font-family:'Kantumruy Pro',sans-serif; opacity:0.8">
                  {{ profileUser.firstNameKh }} {{ profileUser.lastNameKh }}
                </div>
                <div class="text-caption opacity-75">{{ profileUser.position?.nameEn }}</div>
              </div>
            </div>
          </div>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-tabs v-model="profileTab" density="compact">
            <v-tab value="info">Info</v-tab>
            <v-tab value="work">Work</v-tab>
            <v-tab value="family">Family</v-tab>
          </v-tabs>
          <v-window v-model="profileTab" class="pa-4">
            <!-- Info -->
            <v-window-item value="info">
              <v-list density="compact">
                <ProfileRow icon="mdi-card-account-details" label="Employee ID" :value="profileUser.employeeId"/>
                <ProfileRow icon="mdi-email"               label="Email"       :value="profileUser.email"/>
                <ProfileRow icon="mdi-phone"               label="Phone"       :value="profileUser.phone"/>
                <ProfileRow icon="mdi-calendar"            label="Date of Birth" :value="formatDate(profileUser.dateOfBirth)"/>
                <ProfileRow icon="mdi-map-marker"          label="Place of Birth" :value="profileUser.dop"/>
                <ProfileRow icon="mdi-gender-male-female"  label="Gender"      :value="profileUser.gender"/>
                <ProfileRow icon="mdi-card-text"           label="National ID"  :value="profileUser.nationalId"/>
                <ProfileRow icon="mdi-passport"            label="Passport"    :value="profileUser.passportNumber"/>
                <ProfileRow icon="mdi-home"                label="Address"     :value="profileUser.address"/>
                <ProfileRow icon="mdi-school"              label="Education"   :value="profileUser.educationLevel"/>
                <ProfileRow icon="mdi-translate"           label="Languages"   :value="profileUser.foreignLanguages"/>
              </v-list>
            </v-window-item>
            <!-- Work -->
            <v-window-item value="work">
              <v-list density="compact">
                <ProfileRow icon="mdi-domain"             label="Org Unit"     :value="profileUser.orgUnit?.nameEn"/>
                <ProfileRow icon="mdi-briefcase"          label="Position"     :value="profileUser.position?.nameEn"/>
                <ProfileRow icon="mdi-calendar-start"     label="Hire Date"    :value="formatDate(profileUser.hireDate)"/>
                <ProfileRow icon="mdi-calendar-check"     label="Permanent Appointment" :value="formatDate(profileUser.dateOfPermanentAppointment)"/>
                <ProfileRow icon="mdi-clock-time-four"    label="Work Experience" :value="profileUser.workExperience ? `${profileUser.workExperience} years` : null"/>
                <ProfileRow icon="mdi-medal"              label="Rank & Grade" :value="profileUser.currentRankAndGrade"/>
                <ProfileRow icon="mdi-arrow-up-bold"      label="Last Promotion" :value="formatDate(profileUser.dateOfLastPromotion)"/>
                <ProfileRow icon="mdi-star"               label="Medal"        :value="profileUser.medalAwarded"/>
                <ProfileRow icon="mdi-calendar-star"      label="Award Date"   :value="formatDate(profileUser.dateOfAward)"/>
              </v-list>
            </v-window-item>
            <!-- Family -->
            <v-window-item value="family">
              <v-list density="compact">
                <v-list-subheader>Spouse</v-list-subheader>
                <ProfileRow icon="mdi-account-heart" label="Name"       :value="profileUser.nameOfSpouse"/>
                <ProfileRow icon="mdi-briefcase"     label="Occupation" :value="profileUser.occupationOfSpouse"/>
                <ProfileRow icon="mdi-baby"          label="Children"   :value="profileUser.numberOfChildren?.toString()"/>
                <ProfileRow icon="mdi-account-group" label="Siblings"   :value="profileUser.numbersOfSiblings?.toString()"/>
                <v-list-subheader>Father</v-list-subheader>
                <ProfileRow icon="mdi-account" label="Name"            :value="profileUser.fathersName"/>
                <ProfileRow icon="mdi-map-marker" label="Place of Birth" :value="profileUser.dopOfFathers"/>
                <ProfileRow icon="mdi-briefcase"  label="Occupation"   :value="profileUser.fathersOccupation"/>
                <v-list-subheader>Mother</v-list-subheader>
                <ProfileRow icon="mdi-account" label="Name"            :value="profileUser.mothersName"/>
                <ProfileRow icon="mdi-map-marker" label="Place of Birth" :value="profileUser.dopOfMothers"/>
                <ProfileRow icon="mdi-briefcase"  label="Occupation"   :value="profileUser.mothersOccupation"/>
                <v-list-subheader>Father-in-Law</v-list-subheader>
                <ProfileRow icon="mdi-account" label="Name"            :value="profileUser.fathersInLawName"/>
                <ProfileRow icon="mdi-map-marker" label="Place of Birth" :value="profileUser.dopOfFathersInLaw"/>
                <ProfileRow icon="mdi-briefcase"  label="Occupation"   :value="profileUser.fathersInLawOccupation"/>
                <v-list-subheader>Mother-in-Law</v-list-subheader>
                <ProfileRow icon="mdi-account" label="Name"            :value="profileUser.mothersInLawName"/>
                <ProfileRow icon="mdi-map-marker" label="Place of Birth" :value="profileUser.dopOfMothersInLaw"/>
                <ProfileRow icon="mdi-briefcase"  label="Occupation"   :value="profileUser.mothersInLawOccupation"/>
              </v-list>
            </v-window-item>
          </v-window>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer/>
          <v-btn variant="outlined" @click="profileDialog=false">Close</v-btn>
          <v-btn color="primary" variant="tonal" @click="openEdit(profileUser); profileDialog=false"
            prepend-icon="mdi-pencil">Edit</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineComponent, h } from 'vue'
import { format } from 'date-fns'
import api from '@/plugins/axios'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const loading   = ref(false), saving = ref(false)
const dialog    = ref(false), avatarDialog = ref(false), profileDialog = ref(false)
const isValid   = ref(false), formRef = ref()
const formTab   = ref('basic'), profileTab = ref('info')
const search    = ref(''), page = ref(1), total = ref(0)
const users     = ref<any[]>([]), positions = ref<any[]>([]), orgUnits = ref<any[]>([])
const editItem  = ref<any>(null), avatarTarget = ref<any>(null), profileUser = ref<any>(null)
const avatarFile = ref<any[]>([]), avatarPreview = ref('')
const snack     = ref({ show: false, text: '', color: 'success' })

const ROLE_COLORS: Record<string,string> = {
  SYSTEM_ADMIN:'purple', INSTITUTION_HEAD:'deep-purple', DIRECTOR_GENERAL:'indigo',
  DEPARTMENT_CHIEF:'primary', OFFICE_CHIEF:'teal', HR_OFFICER:'amber', EMPLOYEE:'grey',
}
const roleColor = (r?: string) => ROLE_COLORS[r || ''] || 'grey'
const initials  = (u: any)     => `${u.firstName?.[0]||''}${u.lastName?.[0]||''}`
const formatDate = (d?: string) => d ? format(new Date(d), 'MMM d, yyyy') : '—'

// ── ProfileRow mini-component ──────────────────────────────────
const ProfileRow = defineComponent({
  props: { icon: String, label: String, value: [String, Object] as any },
  setup(p) {
    return () => p.value ? h('div', {
      style: 'display:flex; align-items:flex-start; gap:10px; padding:6px 0; border-bottom:1px solid #f1f5f9'
    }, [
      h('v-icon', { size: 14, class: 'mt-1', color: 'primary' }, () => p.icon),
      h('div', {}, [
        h('div', { style: 'font-size:10px; color:#94a3b8' }, p.label),
        h('div', { style: 'font-size:12px; font-weight:600; color:#1e293b' }, p.value),
      ]),
    ]) : null
  }
})

const defaultForm = () => ({
  employeeId:'', email:'', password:'',
  firstName:'', lastName:'', firstNameKh:'', lastNameKh:'',
  gender:'' as any, dateOfBirth:'', dop:'', phone:'',
  nationalId:'', passportNumber:'', address:'',
  signatureOfApplicant:'',
  positionId:'' as any, orgUnitId:'' as any,
  hireDate:'', dateOfPermanentAppointment:'',
  workExperience: null as any, currentRankAndGrade:'',
  dateOfLastPromotion:'', medalAwarded:'', dateOfAward:'',
  educationLevel:'' as any, foreignLanguages:'',
  nameOfSpouse:'', occupationOfSpouse:'',
  workplaceOfSpouse: null as any, numberOfChildren: null as any, numbersOfSiblings: null as any,
  fathersName:'', dopOfFathers:'', fathersOccupation:'',
  mothersName:'', dopOfMothers:'', mothersOccupation:'',
  fathersInLawName:'', dopOfFathersInLaw:'', fathersInLawOccupation:'',
  mothersInLawName:'', dopOfMothersInLaw:'', mothersInLawOccupation:'',
  isActive: true,
})
const form = ref(defaultForm())

let searchTimer: any
function debounceLoad() { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page.value=1; load() }, 400) }

async function load() {
  loading.value = true
  try {
    const res: any = await api.get('/users', {
      params: { page: page.value, limit: 12, search: search.value || undefined }
    })
    const d = res.data || res
    users.value = d.data || d
    total.value = d.total || users.value.length
  } finally { loading.value = false }
}

async function loadOptions() {
  const [pos, org] = await Promise.all([api.get('/positions'), api.get('/organization')])
  positions.value = (pos as any).data || pos
  orgUnits.value  = (org as any).data || org
}

function openCreate() {
  editItem.value = null; form.value = defaultForm()
  formTab.value  = 'basic'; dialog.value = true
}

function openEdit(u: any) {
  editItem.value = u
  form.value = {
    employeeId:u.employeeId||'', email:u.email, password:'',
    firstName:u.firstName||'', lastName:u.lastName||'',
    firstNameKh:u.firstNameKh||'', lastNameKh:u.lastNameKh||'',
    gender:u.gender||'', dateOfBirth:u.dateOfBirth?.split('T')[0]||'',
    dop:u.dop||'', phone:u.phone||'',
    nationalId:u.nationalId||'', passportNumber:u.passportNumber||'',
    address:u.address||'', signatureOfApplicant:u.signatureOfApplicant||'',
    positionId:u.positionId||'', orgUnitId:u.orgUnitId||'',
    hireDate:u.hireDate?.split('T')[0]||'',
    dateOfPermanentAppointment:u.dateOfPermanentAppointment?.split('T')[0]||'',
    workExperience:u.workExperience, currentRankAndGrade:u.currentRankAndGrade||'',
    dateOfLastPromotion:u.dateOfLastPromotion?.split('T')[0]||'',
    medalAwarded:u.medalAwarded||'', dateOfAward:u.dateOfAward?.split('T')[0]||'',
    educationLevel:u.educationLevel||'', foreignLanguages:u.foreignLanguages||'',
    nameOfSpouse:u.nameOfSpouse||'', occupationOfSpouse:u.occupationOfSpouse||'',
    workplaceOfSpouse:u.workplaceOfSpouse, numberOfChildren:u.numberOfChildren,
    numbersOfSiblings:u.numbersOfSiblings,
    fathersName:u.fathersName||'', dopOfFathers:u.dopOfFathers||'',
    fathersOccupation:u.fathersOccupation||'',
    mothersName:u.mothersName||'', dopOfMothers:u.dopOfMothers||'',
    mothersOccupation:u.mothersOccupation||'',
    fathersInLawName:u.fathersInLawName||'', dopOfFathersInLaw:u.dopOfFathersInLaw||'',
    fathersInLawOccupation:u.fathersInLawOccupation||'',
    mothersInLawName:u.mothersInLawName||'', dopOfMothersInLaw:u.dopOfMothersInLaw||'',
    mothersInLawOccupation:u.mothersInLawOccupation||'',
    isActive: u.isActive,
  }
  formTab.value = 'basic'; dialog.value = true
}

function openProfile(u: any) { profileUser.value = u; profileTab.value = 'info'; profileDialog.value = true }

async function save() {
  saving.value = true
  try {
    const payload: any = { ...form.value }
    if (editItem.value && !payload.password) delete payload.password
    // Clean empty strings to null
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    if (editItem.value) await api.patch(`/users/${editItem.value.id}`, payload)
    else await api.post('/users', payload)
    dialog.value = false
    snack.value = { show:true, text: editItem.value ? 'Updated!' : 'User created!', color:'success' }
    await load()
  } catch (e: any) {
    snack.value = { show:true, text: e?.message || 'Failed', color:'error' }
  } finally { saving.value = false }
}

// ── Avatar ───────────────────────────────────────────────────
function openAvatarDialog(u: any) {
  avatarTarget.value = u; avatarFile.value = []; avatarPreview.value = ''
  avatarDialog.value = true
}

function previewAvatar(files: any) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) { avatarPreview.value = ''; return }
  const reader = new FileReader()
  reader.onload = e => { avatarPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)
}

async function uploadAvatar() {
  if (!avatarFile.value?.length || !avatarTarget.value) return
  saving.value = true
  try {
    const file = Array.isArray(avatarFile.value) ? avatarFile.value[0] : avatarFile.value
    const fd = new FormData(); fd.append('file', file as File)
    await api.post(`/users/${avatarTarget.value.id}/avatar`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    avatarDialog.value = false
    snack.value = { show:true, text:'Photo uploaded!', color:'success' }
    await load()
  } catch (e: any) {
    snack.value = { show:true, text: e?.message || 'Upload failed', color:'error' }
  } finally { saving.value = false }
}

async function removeAvatar() {
  saving.value = true
  try {
    await api.delete(`/users/${avatarTarget.value.id}/avatar`)
    avatarDialog.value = false
    snack.value = { show:true, text:'Photo removed!', color:'success' }
    await load()
  } catch (e: any) {
    snack.value = { show:true, text: e?.message || 'Failed', color:'error' }
  } finally { saving.value = false }
}

onMounted(() => Promise.all([load(), loadOptions()]))
</script>
