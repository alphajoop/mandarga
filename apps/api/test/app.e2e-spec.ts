import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { INestApplication } from "@nestjs/common";

import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "./../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/ (GET)", async () => {
    const response = await fetch(
      `http://localhost:${app.getHttpServer().address().port}/`,
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe("Hello World!");
  });
});
