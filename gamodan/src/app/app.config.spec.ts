import { appConfig } from './app.config';

describe('appConfig', () => {
  it('deve estar definido', () => {
    expect(appConfig).toBeTruthy();
  });

  it('deve possuir providers', () => {
    expect(appConfig.providers).toBeDefined();
    expect(appConfig.providers?.length).toBeGreaterThan(0);
  });
});