import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('POST /auth/login → 200 with valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@moi.gov.kh', password: 'Admin@2025!' })
      .expect(200);
    expect(res.body.data?.accessToken || res.body.accessToken).toBeDefined();
    expect(res.body.data?.refreshToken || res.body.refreshToken).toBeDefined();
    accessToken  = res.body.data?.accessToken  || res.body.accessToken;
    refreshToken = res.body.data?.refreshToken || res.body.refreshToken;
  });

  it('POST /auth/login → 401 with wrong password', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@moi.gov.kh', password: 'WrongPass' })
      .expect(401);
  });

  it('POST /auth/login → 401 with unknown email', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'unknown@moi.gov.kh', password: 'Admin@2025!' })
      .expect(401);
  });

  it('GET /auth/me → 200 with valid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data?.email || res.body.email).toBe('admin@moi.gov.kh');
  });

  it('GET /auth/me → 401 without token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('POST /auth/refresh → 200 with new tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(res.body.data?.accessToken || res.body.accessToken).toBeDefined();
  });

  it('POST /auth/refresh → 401 with invalid token', () => {
    return request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'invalid-token-xyz' })
      .expect(401);
  });

  it('POST /auth/logout → 200', () => {
    return request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
