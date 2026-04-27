import { render, screen } from "@testing-library/vue"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createPinia, setActivePinia } from 'pinia';
import App from "~/App.vue"

vi.mock('~/firebase/config', () => ({
  db: {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    onSnapshot: vi.fn(() => () => {})
  }
}));

const mockExchangeStore = {
  purchasePrice: 3.8,
  salePrice: 3.9,
  loading: false,
  error: null,
  convertToDollars: vi.fn().mockImplementation((soles: number) => soles / 3.8),
  convertToSoles: vi.fn().mockImplementation((dollars: number) => dollars * 3.8),
  $reset: vi.fn(),
  $onAction: vi.fn(),
  $patch: vi.fn(),
  $subscribe: vi.fn(),
  $dispose: vi.fn()
};

vi.mock('~/stores/exchange', () => ({
  useExchangeStore: vi.fn(() => mockExchangeStore)
}));

describe("App.vue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the main title', async () => {
    render(App);
    expect(await screen.findByText(/El mejor/)).toBeTruthy();
    expect(await screen.findByText(/tipo de cambio/)).toBeTruthy();
  });

  it('should render the CurrencyConverter component', async () => {
    render(App);
    expect(await screen.findByText(/Dolár compra/)).toBeTruthy();
  });
});
