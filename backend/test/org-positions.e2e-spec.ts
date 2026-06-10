import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Organization & Positions CRUD (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;
  let createdOrgId: string;
  let createdPosId: string;
  let parentOrgId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'admin@moi.gov.kh', password: 'Admin@2025!' });
    adminToken = adminRes.body.data?.accessToken || adminRes.body.accessToken;

    const empRes = await request(app.getHttpServer())
      .post('/auth/login').send({ email: 'chandara@moi.gov.kh', password: 'Staff@2025!' });
    employeeToken = empRes.body.data?.accessToken || empRes.body.accessToken;
  });

  afterAll(async () => { await app.close(); });

  // ════════════════════════════════════════════════════════════
  // ORGANIZATION CRUD
  // ════════════════════════════════════════════════════════════

  describe('Organization Units', () => {

    it('GET /organization → 200 returns list', async () => {
      const res = await request(app.getHttpServer())
        .get('/organization')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      parentOrgId = data[0].id;
    });

    it('GET /organization/tree → 200 returns tree structure', async () => {
      const res = await request(app.getHttpServer())
        .get('/organization/tree')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const tree = res.body.data || res.body;
      expect(Array.isArray(tree)).toBe(true);
      // Root level should have children
      const root = tree[0];
      expect(root).toHaveProperty('children');
    });

    it('POST /organization → 201 creates GENERAL_DEPARTMENT', async () => {
      const res = await request(app.getHttpServer())
        .post('/organization')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST-GD-001',
          nameKh: 'អគ្គនាយកដ្ឋានសាកល្បង',
          nameEn: 'Test General Department',
          type: 'GENERAL_DEPARTMENT',
          parentId: parentOrgId,
        })
        .expect(201);
      const body = res.body.data || res.body;
      expect(body.code).toBe('TEST-GD-001');
      expect(body.type).toBe('GENERAL_DEPARTMENT');
      createdOrgId = body.id;
    });

    it('POST /organization → 409 duplicate code', async () => {
      await request(app.getHttpServer())
        .post('/organization')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'TEST-GD-001', nameKh: 'ស', nameEn: 'Dup', type: 'GENERAL_DEPARTMENT' })
        .expect(409);
    });

    it('POST /organization → 400 invalid hierarchy (INSTITUTION inside DEPARTMENT)', async () => {
      await request(app.getHttpServer())
        .post('/organization')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'TEST-BAD-HIER',
          nameKh: 'ស', nameEn: 'Bad Hierarchy',
          type: 'INSTITUTION',
          parentId: createdOrgId,
        })
        .expect(400);
    });

    it('POST /organization → 403 employee cannot create', async () => {
      await request(app.getHttpServer())
        .post('/organization')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ code: 'TEST-UNAUTH', nameKh: 'ស', nameEn: 'Unauth', type: 'DEPARTMENT' })
        .expect(403);
    });

    it('GET /organization/:id → 200 returns detail with children + users', async () => {
      const res = await request(app.getHttpServer())
        .get(`/organization/${createdOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body.data || res.body;
      expect(body.id).toBe(createdOrgId);
      expect(body).toHaveProperty('children');
      expect(body).toHaveProperty('users');
      expect(body).toHaveProperty('_count');
    });

    it('GET /organization/code/:code → 200 finds by code', async () => {
      const res = await request(app.getHttpServer())
        .get('/organization/code/TEST-GD-001')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body.data || res.body).code).toBe('TEST-GD-001');
    });

    it('GET /organization/:id/staff → 200 returns staff list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/organization/${parentOrgId}/staff`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const staff = res.body.data || res.body;
      expect(Array.isArray(staff)).toBe(true);
    });

    it('GET /organization/:id/staff?includeChildren=true → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/organization/${parentOrgId}/staff?includeChildren=true`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });

    it('PATCH /organization/:id → 200 updates name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/organization/${createdOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nameEn: 'Test General Department (Updated)' })
        .expect(200);
      expect((res.body.data || res.body).nameEn).toBe('Test General Department (Updated)');
    });

    it('PATCH /organization/:id → 409 duplicate code on update', async () => {
      await request(app.getHttpServer())
        .patch(`/organization/${createdOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'MOI' })
        .expect(409);
    });

    it('DELETE /organization/:id → 200 soft-deletes', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/organization/${createdOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body.data || res.body).isActive).toBe(false);
    });

    it('PATCH /organization/:id/restore → 200 restores', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/organization/${createdOrgId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body.data || res.body).isActive).toBe(true);
    });

    it('GET /organization?search=Test → 200 filters by search', async () => {
      const res = await request(app.getHttpServer())
        .get('/organization?search=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = res.body.data || res.body;
      expect(data.some((u: any) => u.code === 'TEST-GD-001')).toBe(true);
    });

    it('GET /organization?type=OFFICE → 200 filters by type', async () => {
      const res = await request(app.getHttpServer())
        .get('/organization?type=OFFICE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = res.body.data || res.body;
      data.forEach((u: any) => expect(u.type).toBe('OFFICE'));
    });
  });

  // ════════════════════════════════════════════════════════════
  // POSITIONS CRUD
  // ════════════════════════════════════════════════════════════

  describe('Positions', () => {

    it('GET /positions → 200 returns list ordered by rank', async () => {
      const res = await request(app.getHttpServer())
        .get('/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      // Should be ordered by rank
      for (let i = 1; i < data.length; i++) {
        expect(data[i].rank).toBeGreaterThanOrEqual(data[i-1].rank);
      }
    });

    it('POST /positions → 201 creates position', async () => {
      const res = await request(app.getHttpServer())
        .post('/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'TEST-POS', nameKh: 'មុខតំណែងសាកល្បង', nameEn: 'Test Position', rank: 9 })
        .expect(201);
      const body = res.body.data || res.body;
      expect(body.code).toBe('TEST-POS');
      expect(body.rank).toBe(9);
      createdPosId = body.id;
    });

    it('POST /positions → 409 duplicate code', async () => {
      await request(app.getHttpServer())
        .post('/positions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'TEST-POS', nameKh: 'ស', nameEn: 'Dup', rank: 9 })
        .expect(409);
    });

    it('POST /positions → 403 employee cannot create', async () => {
      await request(app.getHttpServer())
        .post('/positions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ code: 'UNAUTH-POS', nameKh: 'ស', nameEn: 'Unauth', rank: 9 })
        .expect(403);
    });

    it('GET /positions/:id → 200 returns detail with users', async () => {
      const res = await request(app.getHttpServer())
        .get(`/positions/${createdPosId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body.data || res.body;
      expect(body.id).toBe(createdPosId);
      expect(body).toHaveProperty('users');
      expect(body).toHaveProperty('_count');
    });

    it('GET /positions/code/:code → 200 finds by code', async () => {
      const res = await request(app.getHttpServer())
        .get('/positions/code/TEST-POS')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body.data || res.body).code).toBe('TEST-POS');
    });

    it('PATCH /positions/:id → 200 updates rank', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/positions/${createdPosId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rank: 8, nameEn: 'Test Position Updated' })
        .expect(200);
      const body = res.body.data || res.body;
      expect(body.rank).toBe(8);
      expect(body.nameEn).toBe('Test Position Updated');
    });

    it('POST /positions/reorder → 200 reorders ranks', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/positions')
        .set('Authorization', `Bearer ${adminToken}`);
      const positions = listRes.body.data || listRes.body;
      const orders = positions.map((p: any, i: number) => ({ id: p.id, rank: i + 1 }));

      const res = await request(app.getHttpServer())
        .post('/positions/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orders })
        .expect(200);
      expect(Array.isArray(res.body.data || res.body)).toBe(true);
    });

    it('DELETE /positions/:id → 200 soft-deletes unused position', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/positions/${createdPosId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body.data || res.body).isActive).toBe(false);
    });

    it('PATCH /positions/:id/restore → 200 restores', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/positions/${createdPosId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((res.body.data || res.body).isActive).toBe(true);
    });

    it('GET /positions?search=Test → 200 filters by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/positions?search=Test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = res.body.data || res.body;
      expect(data.some((p: any) => p.code === 'TEST-POS')).toBe(true);
    });

    it('GET /positions?includeInactive=true → includes deactivated', async () => {
      // First deactivate
      await request(app.getHttpServer())
        .delete(`/positions/${createdPosId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app.getHttpServer())
        .get('/positions?includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const data = res.body.data || res.body;
      const found = data.find((p: any) => p.id === createdPosId);
      expect(found).toBeDefined();
      expect(found.isActive).toBe(false);
    });
  });
});
