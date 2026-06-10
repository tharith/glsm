import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let employeeToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const adminRes = await request(app.getHttpServer()).post('/auth/login').send({ email: 'admin@moi.gov.kh', password: 'Admin@2025!' });
    adminToken = adminRes.body.data?.accessToken || adminRes.body.accessToken;

    const empRes = await request(app.getHttpServer()).post('/auth/login').send({ email: 'chandara@moi.gov.kh', password: 'Staff@2025!' });
    employeeToken = empRes.body.data?.accessToken || empRes.body.accessToken;
  });

  afterAll(async () => { await app.close(); });

  it('GET /users → 200 for ADMIN', async () => {
    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body.data || res.body;
    expect(body.data || body).toBeInstanceOf(Array);
  });

  it('GET /users → 403 for EMPLOYEE', () => {
    return request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);
  });

  it('POST /users → 201 creates new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: 'EMP-TEST-001', firstName: 'Test', lastName: 'User', email: 'testuser@moi.gov.kh', password: 'TestPass@123' })
      .expect(201);
    createdUserId = res.body.data?.id || res.body.id;
    expect(createdUserId).toBeDefined();
  });

  it('POST /users → 409 duplicate email', () => {
    return request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ employeeId: 'EMP-TEST-002', firstName: 'Test2', lastName: 'User2', email: 'testuser@moi.gov.kh', password: 'TestPass@123' })
      .expect(409);
  });

  it('GET /users/:id → 200 gets user', async () => {
    const res = await request(app.getHttpServer())
      .get(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect((res.body.data || res.body).email).toBe('testuser@moi.gov.kh');
  });

  it('PATCH /users/:id → 200 updates user', () => {
    return request(app.getHttpServer())
      .patch(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ phone: '012345678' })
      .expect(200);
  });

  it('DELETE /users/:id → 200 soft deletes user', () => {
    return request(app.getHttpServer())
      .delete(`/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
