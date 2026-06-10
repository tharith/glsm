import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/plugins/axios";
import type { LeaveRequest, LeaveBalance, LeaveType } from "@/types";

export const useLeaveStore = defineStore("leave", () => {
  // State
  const myRequests = ref<LeaveRequest[]>([]);
  const approvalQueue = ref<LeaveRequest[]>([]);
  const leaveTypes = ref<LeaveType[]>([]);
  const myBalances = ref<LeaveBalance[]>([]);
  const loading = ref(false);

  // Helper function សម្រាប់ Unwrap ទិន្នន័យពី Axios (អាស្រ័យលើ Axios Interceptor របស់អ្នក)
  const getData = (res: any) => res.data?.data || res.data || res;

  // Actions
  async function fetchLeaveTypes() {
    loading.value = true;
    try {
      const res = await api.get("/leave-types");
      leaveTypes.value = getData(res) as LeaveType[];
    } finally {
      loading.value = false;
    }
  }

  async function fetchMyBalances() {
    loading.value = true;
    try {
      const res = await api.get("/leave-balances/my");
      myBalances.value = getData(res) as LeaveBalance[];
    } finally {
      loading.value = false;
    }
  }

  async function fetchMyRequests(params?: Record<string, any>) {
    loading.value = true;
    try {
      const res = await api.get("/leave-requests/my", { params });
      myRequests.value = getData(res) as LeaveRequest[];
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function fetchApprovalQueue() {
    loading.value = true;
    try {
      const res = await api.get("/leave-requests/queue");
      approvalQueue.value = getData(res) as LeaveRequest[];
    } finally {
      loading.value = false;
    }
  }

  async function submitRequest(
    payload: Omit<LeaveRequest, "id" | "status"> | any,
  ) {
    loading.value = true;
    try {
      const res = await api.post("/leave-requests", payload);
      // អាប់ដេតទិន្នន័យភ្លាមៗក្រោយពេលដាក់ច្បាប់ជោគជ័យ
      await Promise.all([fetchMyRequests(), fetchMyBalances()]);
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function approveRequest(
    id: string,
    payload: { action: "APPROVE" | "REJECT" | string; comment?: string },
  ) {
    loading.value = true;
    try {
      const res = await api.post(`/leave-requests/${id}/approve`, payload);
      // អាប់ដេត Queue ឡើងវិញក្រោយពេលអនុម័តរួច
      await fetchApprovalQueue();
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function cancelRequest(id: string) {
    loading.value = true;
    try {
      const res = await api.post(`/leave-requests/${id}/cancel`);
      // អាប់ដេតបញ្ជីច្បាប់ និងចំនួនថ្ងៃនៅសល់ឡើងវិញ
      await Promise.all([fetchMyRequests(), fetchMyBalances()]);
      return res;
    } finally {
      loading.value = false;
    }
  }

  return {
    myRequests,
    approvalQueue,
    leaveTypes,
    myBalances,
    loading,
    fetchLeaveTypes,
    fetchMyBalances,
    fetchMyRequests,
    fetchApprovalQueue,
    submitRequest,
    approveRequest,
    cancelRequest,
  };
});
