import { describe, it, expect, vi } from 'vitest';

const mockApp = {
  use: vi.fn().mockReturnThis(),
  mount: vi.fn()
};

vi.mock('vue', () => ({
  createApp: vi.fn(() => mockApp)
}));

vi.mock('pinia', () => ({
  createPinia: vi.fn(() => ({})),
  defineStore: vi.fn()
}));

vi.mock('../src/firebase/config', () => ({
  db: {},
  auth: {}
}));

vi.mock('../src/App.vue', () => ({
  default: {
    template: '<div>Test App</div>'
  }
}));

describe('main.ts', () => {
  it('should initialize without errors', async () => {
    await expect(import('../src/main')).resolves.not.toThrow();
  });

  it('should create an app instance', async () => {
    const { createApp } = await import('vue');
    await import('../src/main');
    expect(createApp).toHaveBeenCalled();
  });

  it('should mount the app on #app', async () => {
    await import('../src/main');
    expect(mockApp.mount).toHaveBeenCalledWith('#app');
  });
});
