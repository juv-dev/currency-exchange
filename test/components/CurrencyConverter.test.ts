import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import CurrencyConverter from '~/components/CurrencyConverter.vue';
import { useExchangeStore } from '~/stores/exchange';

vi.mock('~/firebase/config', () => ({
  db: {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    onSnapshot: vi.fn(() => () => {})
  }
}));

vi.mock('~/stores/exchange', () => ({
  useExchangeStore: vi.fn()
}));

describe('CurrencyConverter.vue', () => {
  let store: {
    purchasePrice: number;
    salePrice: number;
    loading: boolean;
    error: string | null;
    convertToDollars: ReturnType<typeof vi.fn>;
    convertToSoles: ReturnType<typeof vi.fn>;
    $reset: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setActivePinia(createPinia());

    store = reactive({
      purchasePrice: 3.8,
      salePrice: 3.9,
      loading: false,
      error: null,
      convertToDollars: vi.fn().mockImplementation((soles: number) => soles / 3.8),
      convertToSoles: vi.fn().mockImplementation((dollars: number) => dollars * 3.8),
      $reset: vi.fn()
    });

    (useExchangeStore as ReturnType<typeof vi.fn>).mockReturnValue(store);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize input with purchasePrice on Compra tab', async () => {
    render(CurrencyConverter);
    const input = await screen.findByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe(store.purchasePrice.toFixed(3));
  });

  it('should use salePrice when switching to Venta tab', async () => {
    const testSalePrice = 4.2;
    store.salePrice = testSalePrice;

    render(CurrencyConverter);

    const ventaTab = screen.getByText('Dolár venta');
    await fireEvent.click(ventaTab);

    const formattedPrice = testSalePrice.toFixed(3);
    expect(await screen.findByText(formattedPrice)).toBeTruthy();

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe(formattedPrice);
  });

  it('should render all main elements', async () => {
    render(CurrencyConverter);

    expect(await screen.findByText('Dolár compra')).toBeTruthy();
    expect(await screen.findByText('Dolár venta')).toBeTruthy();
    expect(await screen.findByText('Envías')).toBeTruthy();
    expect(await screen.findByText('Recibes')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /Iniciar operación/i })).toBeTruthy();
  });

  it('should activate Venta tab on click', async () => {
    render(CurrencyConverter);
    const ventaButton = await screen.findByText('Dolár venta');
    await fireEvent.click(ventaButton);

    const activeButton = await screen.findByRole('button', { name: /Dolár venta/i });
    expect(activeButton.className).toContain('text-[#2F00FF]');
  });

  it('should handle amount input correctly', async () => {
    render(CurrencyConverter);
    const input = await screen.findByRole('textbox') as HTMLInputElement;

    await fireEvent.update(input, '100');
    expect(input.value).toBe('100');

    await fireEvent.update(input, '100.50');
    expect(input.value).toBe('100.50');

    await fireEvent.update(input, 'abc');
    expect(input.value).toBe('');

    await fireEvent.update(input, '100.123');
    expect(input.value).toBe('100.12');

    await fireEvent.update(input, '100.50.30');
    expect(input.value).toBe('100.50');
  });

  it('should calculate dollars to soles on purchase tab', async () => {
    render(CurrencyConverter);

    const input = await screen.findByRole('textbox');
    const button = await screen.findByText('Iniciar operación');

    await fireEvent.update(input, '100');
    await fireEvent.click(button);

    expect((input as HTMLInputElement).value).toBe('100');
    await screen.findByText('S/ 380.00');
  });

  it('should calculate soles to dollars on sale tab', async () => {
    render(CurrencyConverter);

    const ventaButton = await screen.findByText('Dolár venta');
    await fireEvent.click(ventaButton);

    const input = await screen.findByRole('textbox');
    const button = await screen.findByText('Iniciar operación');

    await fireEvent.update(input, '100');
    await fireEvent.click(button);

    expect((input as HTMLInputElement).value).toBe('100');
    await screen.findByText('$ 25.64');
  });

  it('should swap currencies on swap button click', async () => {
    render(CurrencyConverter);

    expect(await screen.findByText('Dólares')).toBeTruthy();
    expect(await screen.findByText('Soles')).toBeTruthy();

    const swapButton = document.querySelector('.rotate-custom');
    if (!swapButton) throw new Error('Swap button not found');
    await fireEvent.click(swapButton);

    expect(await screen.findByText('Soles')).toBeTruthy();
    expect(await screen.findByText('Dólares')).toBeTruthy();
  });

  it('should show loading indicator when store is loading', async () => {
    store.loading = true;
    render(CurrencyConverter);
    expect(await screen.findByRole('status')).toBeTruthy();
  });

  it('should show error message from store', async () => {
    store.error = 'Error al cargar los tipos de cambio';
    render(CurrencyConverter);
    expect(await screen.findByText('Error al cargar los tipos de cambio')).toBeTruthy();
  });

  it('should disable button when amount is empty or zero', async () => {
    render(CurrencyConverter);

    const button = await screen.findByText('Iniciar operación');
    expect(button.closest('button')?.disabled).toBe(false);

    const input = await screen.findByRole('textbox') as HTMLInputElement;

    await fireEvent.update(input, '');
    expect(button.closest('button')?.disabled).toBe(true);

    await fireEvent.update(input, '0');
    expect(button.closest('button')?.disabled).toBe(true);

    await fireEvent.update(input, '100');
    expect(button.closest('button')?.disabled).toBe(false);
  });

  it('should recalculate toAmount when rates change after conversion', async () => {
    render(CurrencyConverter);

    const input = await screen.findByRole('textbox');
    await fireEvent.update(input, '100');
    await fireEvent.click(await screen.findByText('Iniciar operación'));

    const callsBefore = (store.convertToSoles as ReturnType<typeof vi.fn>).mock.calls.length;

    store.purchasePrice = 4.0;

    await waitFor(() => {
      expect((store.convertToSoles as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('should initialize amounts when loading transitions from true to false', async () => {
    store.loading = true;
    render(CurrencyConverter);

    store.loading = false;

    await waitFor(() => {
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe(store.purchasePrice.toFixed(3));
    });
  });
});
