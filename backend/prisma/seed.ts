import {
  PrismaClient,
  RoleName,
  LeaveTypeCode,
  OrgUnitType,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding GLMS database...");

  // 1. Roles
  const roleNames = Object.values(RoleName);
  const roles: Record<string, any> = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: name.replace(/_/g, " ") },
    });
  }
  console.log("✅ Roles seeded");

  // 2. Permissions
  const permissions = [
    // User module
    // ── User module (PDF: user:create, user:view, user:update, user:delete)
    {
      action: "user:create",
      module: "user",
      description: "Create user account",
    },
    {
      action: "user:view",
      module: "user",
      description: "View user profiles and list",
    },
    {
      action: "user:update",
      module: "user",
      description: "Update user information",
    },
    { action: "user:delete", module: "user", description: "Deactivate users" },
    {
      action: "user:manage",
      module: "user",
      description: "Full user management",
    },
    {
      action: "role:assign",
      module: "user",
      description: "Assign roles to users",
    },
    // ── Org module
    { action: "org:view", module: "org", description: "View org structure" },
    { action: "org:create", module: "org", description: "Create org unit" },
    { action: "org:update", module: "org", description: "Update org unit" },
    // ── Leave module (PDF: leave:request, leave:approve, leave:verify, leave:reject)
    {
      action: "leave:request",
      module: "leave",
      description: "Submit leave request",
    },
    {
      action: "leave:view",
      module: "leave",
      description: "View leave requests",
    },
    {
      action: "leave:approve",
      module: "leave",
      description: "Approve leave requests",
    },
    {
      action: "leave:reject",
      module: "leave",
      description: "Reject leave requests",
    },
    {
      action: "leave:verify",
      module: "leave",
      description: "HR verify leave requests",
    },
    {
      action: "leave:cancel",
      module: "leave",
      description: "Cancel own leave request",
    },
    {
      action: "leave:manage",
      module: "leave",
      description: "Full leave management",
    },
    // ── Balance (PDF: balance:view, balance:update)
    {
      action: "balance:view",
      module: "balance",
      description: "View leave balances",
    },
    {
      action: "balance:update",
      module: "balance",
      description: "Adjust leave balances",
    },
    {
      action: "balance:allocate",
      module: "balance",
      description: "Bulk allocate yearly balances",
    },
    // ── Workflow
    {
      action: "workflow:manage",
      module: "workflow",
      description: "Manage workflow definitions",
    },
    // ── Reports (PDF: report:view)
    {
      action: "report:view",
      module: "report",
      description: "View reports and analytics",
    },
    {
      action: "report:export",
      module: "report",
      description: "Export reports to Excel/CSV",
    },
    // ── Delegation + Notifications + Audit
    {
      action: "delegation:create",
      module: "delegation",
      description: "Create approval delegations",
    },
    {
      action: "notification:view",
      module: "notification",
      description: "View notifications",
    },
    {
      action: "audit:view",
      module: "audit",
      description: "View audit logs (admin only)",
    },
    // ── System admin
    {
      action: "system:admin",
      module: "system",
      description: "Full system administration",
    },
  ];
  const permMap: Record<string, any> = {};
  for (const p of permissions) {
    permMap[p.action] = await prisma.permission.upsert({
      where: { action: p.action },
      update: {},
      create: p,
    });
  }
  console.log("✅ Permissions seeded");

  // 3. Role → Permission mapping
  const rolePerms: Record<string, string[]> = {
    // PDF spec: SYSTEM_ADMIN gets ALL permissions
    SYSTEM_ADMIN: Object.keys(permMap),

    // PDF spec: INSTITUTION_HEAD — approves all, views reports, can delegate
    INSTITUTION_HEAD: [
      "leave:view",
      "leave:approve",
      "leave:reject",
      "report:view",
      "org:view",
      "delegation:create",
      "notification:view",
    ],

    // PDF spec: DIRECTOR_GENERAL — approves, views reports
    DIRECTOR_GENERAL: [
      "leave:view",
      "leave:approve",
      "leave:reject",
      "report:view",
      "org:view",
      "delegation:create",
      "notification:view",
    ],

    // PDF spec: DEPARTMENT_CHIEF — approves at dept level
    DEPARTMENT_CHIEF: [
      "leave:view",
      "leave:approve",
      "leave:reject",
      "org:view",
      "delegation:create",
      "notification:view",
    ],

    // PDF spec: OFFICE_CHIEF — first level approval
    OFFICE_CHIEF: [
      "leave:view",
      "leave:approve",
      "leave:reject",
      "delegation:create",
      "notification:view",
    ],

    // PDF spec: HR_OFFICER — user:view, leave:verify, balance:update
    HR_OFFICER: [
      "user:view",
      "user:update",
      "leave:view",
      "leave:verify",
      "leave:approve",
      "leave:reject",
      "leave:manage",
      "balance:view",
      "balance:update",
      "balance:allocate",
      "report:view",
      "report:export",
      "org:view",
      "notification:view",
    ],

    // PDF spec: EMPLOYEE — submit leave, view own balance
    EMPLOYEE: [
      "leave:request",
      "leave:view",
      "leave:cancel",
      "balance:view",
      "org:view",
      "notification:view",
    ],
  };
  for (const [roleName, perms] of Object.entries(rolePerms)) {
    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: roles[roleName].id,
            permissionId: permMap[perm].id,
          },
        },
        update: {},
        create: { roleId: roles[roleName].id, permissionId: permMap[perm].id },
      });
    }
  }
  console.log("✅ Role-Permissions mapped");

  // 4. Org Units
  const moi = await prisma.orgUnit.upsert({
    where: { code: "MOI" },
    update: {},
    create: {
      code: "MOI",
      nameKh: "អង្គភាពប្រឆាំងអំពើពុករលួយ",
      nameEn: "Ministry of Information",
      type: OrgUnitType.INSTITUTION,
    },
  });
  const gdIT = await prisma.orgUnit.upsert({
    where: { code: "MOI-GD-IT" },
    update: {},
    create: {
      code: "MOI-GD-IT",
      nameKh: "អគ្គនាយកដ្ឋានIT",
      nameEn: "General Dept. of Information Technology",
      type: OrgUnitType.GENERAL_DEPARTMENT,
      parentId: moi.id,
    },
  });
  const gdInfo = await prisma.orgUnit.upsert({
    where: { code: "MOI-GD-INFO" },
    update: {},
    create: {
      code: "MOI-GD-INFO",
      nameKh: "អគ្គនាយកដ្ឋានព័ត៌មាន",
      nameEn: "General Dept. of Information",
      type: OrgUnitType.GENERAL_DEPARTMENT,
      parentId: moi.id,
    },
  });
  const deptIT = await prisma.orgUnit.upsert({
    where: { code: "MOI-DEPT-SW" },
    update: {},
    create: {
      code: "MOI-DEPT-SW",
      nameKh: "នាយកដ្ឋានអភិវឌ្ឍន៍កម្មវិធី",
      nameEn: "Software Development Dept.",
      type: OrgUnitType.DEPARTMENT,
      parentId: gdIT.id,
    },
  });
  const deptHR = await prisma.orgUnit.upsert({
    where: { code: "MOI-DEPT-HR" },
    update: {},
    create: {
      code: "MOI-DEPT-HR",
      nameKh: "នាយកដ្ឋានរដ្ឋបាលបុគ្គលិក",
      nameEn: "HR & Administration Dept.",
      type: OrgUnitType.DEPARTMENT,
      parentId: moi.id,
    },
  });
  const offSW = await prisma.orgUnit.upsert({
    where: { code: "MOI-OFF-SW1" },
    update: {},
    create: {
      code: "MOI-OFF-SW1",
      nameKh: "ការយ៉ាល័យអភិវឌ្ឍន៍ប្រព័ន្ធ",
      nameEn: "Systems Development Office",
      type: OrgUnitType.OFFICE,
      parentId: deptIT.id,
    },
  });
  console.log("✅ Org Units seeded");

  // 5. Positions
  const positions: Record<string, any> = {};
  const posData = [
    {
      code: "IH",
      nameKh: "ប្រធានស្ថាប័ន",
      nameEn: "Institution Head",
      rank: 1,
    },
    {
      code: "DEPUTY",
      nameKh: "អនុប្រធានអង្គភាព",
      nameEn: "Deputy Institution Head",
      rank: 2,
    },
    { code: "ADV", nameKh: "ឧបការី", nameEn: "Advisor", rank: 2 },
    {
      code: "ASST",
      nameKh: "ជំនួយការប្រធានអង្គភាព",
      nameEn: "Assistant Institution Head",
      rank: 2,
    },
    { code: "DG", nameKh: "អគ្គនាយក", nameEn: "Director General", rank: 2 },
    {
      code: "DC",
      nameKh: "ប្រធាននាយកដ្ឋាន",
      nameEn: "Department Chief",
      rank: 3,
    },
    { code: "OC", nameKh: "ប្រធានការយ៉ាល័យ", nameEn: "Office Chief", rank: 4 },
    { code: "HR", nameKh: "មន្ត្រីបុគ្គលិក", nameEn: "HR Officer", rank: 4 },
    {
      code: "DEV",
      nameKh: "អ្នកអភិវឌ្ឍន៍កម្មវិធី",
      nameEn: "Software Developer",
      rank: 5,
    },
    {
      code: "STAFF",
      nameKh: "មន្ត្រីរដ្ឋបាល",
      nameEn: "Staff Officer",
      rank: 5,
    },
  ];
  for (const p of posData) {
    positions[p.code] = await prisma.position.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }
  console.log("✅ Positions seeded");

  // 6. Leave Types
  const ltData = [
    {
      code: "ANNUAL",
      nameKh: "ច្បាប់សម្រាកប្រចាំឆ្នាំ",
      nameEn: "Annual Leave",
      maxDaysPerYear: 18,
      isPaid: true,
      carryOver: true,
      maxCarryOver: 5,
    },
    {
      code: "SICK",
      nameKh: "ច្បាប់ឈឺ",
      nameEn: "Sick Leave",
      maxDaysPerYear: 30,
      isPaid: true,
      requiresDoc: true,
    },
    {
      code: "MATERNITY",
      nameKh: "ច្បាប់សម្រាលកូន",
      nameEn: "Maternity Leave",
      maxDaysPerYear: 90,
      isPaid: true,
      gender: "F",
    },
    {
      code: "PATERNITY",
      nameKh: "ច្បាប់ភរិយាសម្រាលកូន",
      nameEn: "Paternity Leave",
      maxDaysPerYear: 10,
      isPaid: true,
      gender: "M",
    },
    {
      code: "SPECIAL",
      nameKh: "ច្បាប់ពិសេស",
      nameEn: "Special Leave",
      maxDaysPerYear: 5,
      isPaid: true,
    },
    {
      code: "STUDY",
      nameKh: "ច្បាប់សិក្សា",
      nameEn: "Study Leave",
      maxDaysPerYear: 30,
      isPaid: true,
    },
    {
      code: "MISSION",
      nameKh: "ច្បាប់បេសកកម្ម",
      nameEn: "Mission Leave",
      maxDaysPerYear: 60,
      isPaid: true,
    },
    {
      code: "UNPAID",
      nameKh: "ច្បាប់គ្មានប្រាក់បៀវត្សរ៍",
      nameEn: "Unpaid Leave",
      maxDaysPerYear: 30,
      isPaid: false,
    },
  ];
  const leaveTypes: Record<string, any> = {};
  for (const lt of ltData) {
    leaveTypes[lt.code] = await prisma.leaveType.upsert({
      where: { code: lt.code as LeaveTypeCode },
      update: {},
      create: lt as any,
    });
  }
  console.log("✅ Leave Types seeded");

  // 7. Public Holidays (Cambodia 2025)
  const holidays2025 = [
    {
      nameKh: "ចូលឆ្នាំថ្មីជាតិ",
      nameEn: "New Year's Day",
      date: new Date("2025-01-01"),
      year: 2025,
    },
    {
      nameKh: "ជ័យជម្នះលើការប្រល័យពូជ",
      nameEn: "Victory Day",
      date: new Date("2025-01-07"),
      year: 2025,
    },
    {
      nameKh: "ថ្ងៃទិវានារី",
      nameEn: "International Women's Day",
      date: new Date("2025-03-08"),
      year: 2025,
    },
    {
      nameKh: "ចូលឆ្នាំខ្មែរ",
      nameEn: "Khmer New Year",
      date: new Date("2025-04-14"),
      year: 2025,
    },
    {
      nameKh: "ចូលឆ្នាំខ្មែរ",
      nameEn: "Khmer New Year",
      date: new Date("2025-04-15"),
      year: 2025,
    },
    {
      nameKh: "ចូលឆ្នាំខ្មែរ",
      nameEn: "Khmer New Year",
      date: new Date("2025-04-16"),
      year: 2025,
    },
    {
      nameKh: "ទិវាពលករ",
      nameEn: "International Labour Day",
      date: new Date("2025-05-01"),
      year: 2025,
    },
    {
      nameKh: "ព្រះរាជពិធីបុណ្យចម្រើនព្រះជន្ម",
      nameEn: "King's Birthday",
      date: new Date("2025-05-14"),
      year: 2025,
    },
    {
      nameKh: "ថ្ងៃជាតិ",
      nameEn: "National Day",
      date: new Date("2025-11-09"),
      year: 2025,
    },
    {
      nameKh: "បុណ្យអុំទូក",
      nameEn: "Water Festival",
      date: new Date("2025-11-05"),
      year: 2025,
    },
  ];
  for (const h of holidays2025) {
    await prisma.publicHoliday
      .upsert({
        where: { id: h.nameEn + h.date.toISOString() },
        update: {},
        create: h,
      })
      .catch(() => prisma.publicHoliday.create({ data: h }));
  }
  console.log("✅ Public Holidays seeded");

  // 8. Workflow Definition
  const wfDef = await prisma.workflowDefinition.upsert({
    where: { id: "default-workflow" },
    update: {},
    create: {
      id: "default-workflow",
      name: "Standard Employee Workflow",
      description: "លំហូរការងារស្ដង់ដារ ៤ ជំហាន",
      steps: {
        create: [
          {
            stepNumber: 1,
            name: "Office Chief Review",
            approverRole: RoleName.OFFICE_CHIEF,
            timeoutHours: 48,
          },
          {
            stepNumber: 2,
            name: "Department Chief Review",
            approverRole: RoleName.DEPARTMENT_CHIEF,
            timeoutHours: 48,
          },
          {
            stepNumber: 3,
            name: "HR Verification",
            approverRole: RoleName.HR_OFFICER,
            timeoutHours: 24,
          },
          {
            stepNumber: 4,
            name: "Director General Approval",
            approverRole: RoleName.DIRECTOR_GENERAL,
            timeoutHours: 72,
          },
        ],
      },
    },
  });
  await prisma.workflowAssignment.upsert({
    where: { id: "default-assignment" },
    update: {},
    create: {
      id: "default-assignment",
      orgUnitId: moi.id,
      definitionId: wfDef.id,
    },
  });
  console.log("✅ Workflow seeded");

  // 9. Seed Users
  const hash = async (pw: string) => bcrypt.hash(pw, 12);
  const usersData = [
    {
      employeeId: "EMP-001",
      firstName: "System",
      lastName: "Admin",
      firstNameKh: "ប្រព័ន្ធ",
      lastNameKh: "អ្នកគ្រប់គ្រង",
      email: "admin@moi.gov.kh",
      signatureOfApplicant: "ADMIN-001",
      pw: "Admin@2025!",
      role: RoleName.SYSTEM_ADMIN,
      posCode: "STAFF",
      orgId: moi.id,
    },
    {
      employeeId: "EMP-002",
      firstName: "Pich",
      lastName: "Sokheng",
      firstNameKh: "ពេជ្រ",
      lastNameKh: "សុខហេង",
      email: "sokheng@moi.gov.kh",
      pw: "Staff@2025!",
      role: RoleName.INSTITUTION_HEAD,
      posCode: "IH",
      orgId: moi.id,
    },
    {
      employeeId: "EMP-003",
      firstName: "Chean",
      lastName: "Sreyneang",
      firstNameKh: "ឈាន",
      lastNameKh: "ស្រីនាង",
      email: "sreyneang@moi.gov.kh",
      pw: "Staff@2025!",
      role: RoleName.DIRECTOR_GENERAL,
      posCode: "DG",
      orgId: gdIT.id,
    },
    {
      employeeId: "EMP-004",
      firstName: "Khan",
      lastName: "Sophal",
      firstNameKh: "ខាន់",
      lastNameKh: "សុផល",
      email: "sophal@moi.gov.kh",
      pw: "Staff@2025!",
      role: RoleName.HR_OFFICER,
      posCode: "HR",
      orgId: deptHR.id,
    },
    {
      employeeId: "EMP-005",
      firstName: "Heng",
      lastName: "Sopheak",
      firstNameKh: "ហេង",
      lastNameKh: "សុភាព",
      email: "sopheak@moi.gov.kh",
      pw: "Staff@2025!",
      role: RoleName.DEPARTMENT_CHIEF,
      posCode: "DC",
      orgId: deptIT.id,
    },
    {
      employeeId: "EMP-006",
      firstName: "Ly",
      lastName: "Naris",
      firstNameKh: "លី",
      lastNameKh: "ណារីស",
      email: "naris@moi.gov.kh",
      pw: "Staff@2025!",
      role: RoleName.OFFICE_CHIEF,
      posCode: "OC",
      orgId: offSW.id,
    },
    {
      employeeId: "EMP-007",
      firstName: "Sok",
      lastName: "Chandara",
      firstNameKh: "សុខ",
      lastNameKh: "ចាន់ដារ៉ា",
      email: "chandara@moi.gov.kh",
      signatureOfApplicant: "SIG-2025-001",
      pw: "Staff@2025!",
      role: RoleName.EMPLOYEE,
      posCode: "DEV",
      orgId: offSW.id,
    },
    {
      employeeId: "EMP-008",
      firstName: "Dara",
      lastName: "Pisach",
      firstNameKh: "ដារ៉ា",
      lastNameKh: "ពិសាច",
      email: "pisach@moi.gov.kh",
      pw: "Staff@2025!",
      role: RoleName.EMPLOYEE,
      posCode: "DEV",
      orgId: offSW.id,
    },
  ];

  for (const u of usersData) {
    const pos = positions[u.posCode];
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    let user;
    if (!existing) {
      user = await prisma.user.create({
        data: {
          employeeId: u.employeeId,
          firstName: u.firstName,
          lastName: u.lastName,
          firstNameKh: u.firstNameKh,
          lastNameKh: u.lastNameKh,
          email: u.email,
          passwordHash: await hash(u.pw),
          positionId: pos?.id,
          orgUnitId: u.orgId,
        },
      });
    } else {
      user = existing;
    }

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles[u.role].id } },
      update: {},
      create: { userId: user.id, roleId: roles[u.role].id },
    });

    // Allocate leave balances for 2025
    const year = 2025;
    for (const lt of Object.values(leaveTypes) as any[]) {
      await prisma.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_year: {
            userId: user.id,
            leaveTypeId: lt.id,
            year,
          },
        },
        update: {},
        create: {
          userId: user.id,
          leaveTypeId: lt.id,
          year,
          allocated: lt.maxDaysPerYear,
          available: lt.maxDaysPerYear,
        },
      });
    }
  }
  console.log("✅ Users seeded with balances");
  console.log("\n🎉 Seed complete! Default credentials:");
  console.log("   thavrith@acu.gov.kh     → Admin@2025!  (SYSTEM_ADMIN)");
  console.log("   chandara@acu.gov.kh  → Staff@2025!  (EMPLOYEE)");
  console.log("   naris@acu.gov.kh     → Staff@2025!  (OFFICE_CHIEF)");
  console.log("   sopheak@acu.gov.kh   → Staff@2025!  (DEPARTMENT_CHIEF)");
  console.log("   sophal@acu.gov.kh    → Staff@2025!  (HR_OFFICER)");
  console.log("   sreyneang@acu.gov.kh → Staff@2025!  (DIRECTOR_GENERAL)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
