import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Leave Requests — Full Lifecycle (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let employeeToken: string;
  let officeChiefToken: string;
  let deptChiefToken: string;
  let hrToken: string;
  let dgToken: string;
  let leaveTypeId: string;
  let requestId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Login all roles
    const login = async (email: string, pw: string) => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email, password: pw });
      return res.body.data?.accessToken || res.body.accessToken;
    };
    [employeeToken, officeChiefToken, deptChiefToken, hrToken, dgToken] = await Promise.all([
      login('chandara@moi.gov.kh',  'Staff@2025!'),
      login('naris@moi.gov.kh',     'Staff@2025!'),
      login('sopheak@moi.gov.kh',   'Staff@2025!'),
      login('sophal@moi.gov.kh',    'Staff@2025!'),
      login('sreyneang@moi.gov.kh', 'Staff@2025!'),
    ]);

    // Get annual leave type
    const lt = await prisma.leaveType.findUnique({ where: { code: 'ANNUAL' } });
    leaveTypeId = lt!.id;
  });

  afterAll(async () => { await app.close(); });

  // ── Phase 3: Leave Foundation ─────────────────────────────
  it('GET /leave-types → returns 8 types', async () => {
    const res = await request(app.getHttpServer())
      .get('/leave-types')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    const types = res.body.data || res.body;
    expect(types.length).toBeGreaterThanOrEqual(8);
  });

  it('GET /leave-balances/my → returns balances for employee', async () => {
    const res = await request(app.getHttpServer())
      .get('/leave-balances/my')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    const balances = res.body.data || res.body;
    expect(balances.length).toBeGreaterThan(0);
    expect(balances[0]).toHaveProperty('allocated');
    expect(balances[0]).toHaveProperty('available');
  });

  // ── Phase 5: Submit Request ───────────────────────────────
  it('POST /leave-requests → submits with SUBMITTED status', async () => {
    const res = await request(app.getHttpServer())
      .post('/leave-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveTypeId, startDate: '2025-10-06', endDate: '2025-10-08', reason: 'E2E test leave request' })
      .expect(201);
    const body = res.body.data || res.body;
    expect(body.status).toBe('SUBMITTED');
    expect(body.refNumber).toMatch(/^LR-/);
    expect(body.totalDays).toBeGreaterThan(0);
    requestId = body.id;
  });

  it('POST /leave-requests → rejects if insufficient balance', async () => {
    await request(app.getHttpServer())
      .post('/leave-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveTypeId, startDate: '2025-10-01', endDate: '2025-12-31', reason: 'Way too many days' })
      .expect(400);
  });

  it('GET /leave-requests/my → employee sees own requests', async () => {
    const res = await request(app.getHttpServer())
      .get('/leave-requests/my')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    const body = res.body.data || res.body;
    expect(body.data || body).toBeInstanceOf(Array);
  });

  // ── Phase 4+5: Approval Workflow ─────────────────────────
  it('GET /leave-requests/queue → Office Chief sees pending request', async () => {
    const res = await request(app.getHttpServer())
      .get('/leave-requests/queue')
      .set('Authorization', `Bearer ${officeChiefToken}`)
      .expect(200);
    const queue = res.body.data || res.body;
    expect(queue.some((r: any) => r.id === requestId)).toBe(true);
  });

  it('POST /approve → Office Chief approves → OFFICE_APPROVED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/leave-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${officeChiefToken}`)
      .send({ action: 'APPROVED', comment: 'Approved by Office Chief — e2e test' })
      .expect(200);
    expect((res.body.data || res.body).status).toBe('OFFICE_APPROVED');
  });

  it('POST /approve → wrong role cannot approve → 403', async () => {
    await request(app.getHttpServer())
      .post(`/leave-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${officeChiefToken}`)
      .send({ action: 'APPROVED', comment: 'Double approve attempt' })
      .expect(403);
  });

  it('POST /approve → Dept Chief approves → DEPT_APPROVED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/leave-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${deptChiefToken}`)
      .send({ action: 'APPROVED', comment: 'Approved by Dept Chief' })
      .expect(200);
    expect((res.body.data || res.body).status).toBe('DEPT_APPROVED');
  });

  it('POST /approve → HR verifies → HR_VERIFIED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/leave-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ action: 'VERIFIED', comment: 'HR verified' })
      .expect(200);
    expect((res.body.data || res.body).status).toBe('HR_VERIFIED');
  });

  it('POST /approve → Director General approves → COMPLETED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/leave-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${dgToken}`)
      .send({ action: 'APPROVED', comment: 'Final DG approval' })
      .expect(200);
    expect((res.body.data || res.body).status).toBe('COMPLETED');
  });

  it('GET /leave-requests/:id → has all 4 approvals', async () => {
    const res = await request(app.getHttpServer())
      .get(`/leave-requests/${requestId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    const body = res.body.data || res.body;
    expect(body.approvals.length).toBe(4);
    expect(body.status).toBe('COMPLETED');
  });

  // ── Cancel Flow ───────────────────────────────────────────
  it('POST /leave-requests → DRAFT → cancel succeeds', async () => {
    const newReq = await request(app.getHttpServer())
      .post('/leave-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveTypeId, startDate: '2025-11-03', endDate: '2025-11-03', reason: 'Draft to cancel', asDraft: true })
      .expect(201);
    const draftId = (newReq.body.data || newReq.body).id;
    await request(app.getHttpServer())
      .post(`/leave-requests/${draftId}/cancel`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
  });

  // ── Phase 6: Notifications ────────────────────────────────
  it('GET /notifications → employee has notifications', async () => {
    const res = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    const notifs = res.body.data || res.body;
    expect(notifs.length).toBeGreaterThan(0);
  });

  it('PATCH /notifications/read-all → marks all read', () => {
    return request(app.getHttpServer())
      .patch('/notifications/read-all')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
  });

  // ── Phase 6: Reports ─────────────────────────────────────
  it('GET /reports/dashboard → returns stats', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/dashboard')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);
    const body = res.body.data || res.body;
    expect(body).toHaveProperty('myPending');
    expect(body).toHaveProperty('myApproved');
    expect(body).toHaveProperty('myBalances');
  });

  it('GET /reports/leave → HR can access leave report', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/leave')
      .set('Authorization', `Bearer ${hrToken}`)
      .expect(200);
    const body = res.body.data || res.body;
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
  });
});
