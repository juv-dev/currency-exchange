import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useExchangeStore } from '~/stores/exchange';

vi.mock('firebase/firestore', () => {
  const mockOnSnapshot = vi.fn();
  const mockDoc = vi.fn();
  const mockUnsubscribe = vi.fn();

  return {
    onSnapshot: mockOnSnapshot,
    doc: mockDoc,
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    __mocks: { mockOnSnapshot, mockDoc, mockUnsubscribe },
  };
});

vi.mock('~/firebase/config', () => ({
  db: {},
  ratesDocRef: { path: 'rates/TDmXIypgLKKfNggHHSnw' },
}));

type MockSnapshot = {
  exists: () => boolean;
  data: () => { purchase_price?: number; sale_price?: number } | null;
};

describe('useExchangeStore', () => {
  let store: ReturnType<typeof useExchangeStore>;
  let mockOnSnapshot: ReturnType<typeof vi.fn>;
  let mockDoc: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let mockOnNext: (snapshot: MockSnapshot) => void;
  let mockOnError: (error: Error) => void;

  beforeEach(async () => {
    setActivePinia(createPinia());

    const firestore = await vi.importMock<any>('firebase/firestore');
    mockOnSnapshot = firestore.__mocks.mockOnSnapshot;
    mockDoc = firestore.__mocks.mockDoc;
    mockUnsubscribe = firestore.__mocks.mockUnsubscribe;

    mockOnSnapshot.mockReset();
    mockDoc.mockReset();
    mockUnsubscribe.mockReset();

    mockOnSnapshot.mockImplementation((_docRef: unknown, onNext: typeof mockOnNext, onError?: typeof mockOnError) => {
      mockOnNext = onNext;
      mockOnError = onError || (() => {});
      return mockUnsubscribe;
    });

    mockDoc.mockReturnValue({ path: 'rates/TDmXIypgLKKfNggHHSnw' });

    store = useExchangeStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    expect(store.purchasePrice).toBe(0);
    expect(store.salePrice).toBe(0);
    expect(store.loading).toBe(true);
    expect(store.error).toBeNull();
  });

  it('should subscribe to Firestore changes on init', () => {
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    expect(mockDoc).toHaveBeenCalledWith({}, 'rates', 'TDmXIypgLKKfNggHHSnw');
  });

  it('should update prices when Firestore snapshot arrives', async () => {
    mockOnNext({
      exists: () => true,
      data: () => ({ purchase_price: 3.85, sale_price: 3.95 }),
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(store.purchasePrice).toBe(3.85);
    expect(store.salePrice).toBe(3.95);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('should handle Firestore error', async () => {
    const error = new Error('Connection error');
    mockOnError(error);

    await new Promise((r) => setTimeout(r, 0));

    expect(store.error).toBe('Error al conectar con la base de datos. Recargando...');
    expect(store.loading).toBe(false);
  });

  it('should clean up subscription on reset', () => {
    store.$reset();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should convert soles to dollars using sale price', () => {
    store.salePrice = 3.8;
    expect(store.convertToDollars(38)).toBeCloseTo(10);
  });

  it('should convert dollars to soles using purchase price', () => {
    store.purchasePrice = 3.9;
    expect(store.convertToSoles(10)).toBeCloseTo(39);
  });

  it('should return 0 from convertToDollars when salePrice is 0', () => {
    expect(store.convertToDollars(100)).toBe(0);
  });

  it('should return 0 from convertToSoles when purchasePrice is 0', () => {
    expect(store.convertToSoles(100)).toBe(0);
  });

  it('should set error when document does not exist', async () => {
    mockOnNext({
      exists: () => false,
      data: () => ({}),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.error).toBe('No se encontró el documento de tasas de cambio');
    expect(store.loading).toBe(false);
  });

  it('should use 0 as default when data has no prices', async () => {
    mockOnNext({
      exists: () => true,
      data: () => ({}),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.purchasePrice).toBe(0);
    expect(store.salePrice).toBe(0);
  });

  it('should not update state when data is null', async () => {
    mockOnNext({
      exists: () => true,
      data: () => null,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.purchasePrice).toBe(0);
    expect(store.loading).toBe(true);
  });

  it('should expose correct values via rates computed', async () => {
    mockOnNext({
      exists: () => true,
      data: () => ({ purchase_price: 3.85, sale_price: 3.95 }),
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(store.rates).toEqual({ purchase: 3.85, sale: 3.95 });
  });
});
