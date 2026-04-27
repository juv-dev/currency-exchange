import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export const useExchangeStore = defineStore('exchange', () => {
  const purchasePrice = ref(0);
  const salePrice = ref(0);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const ratesDocRef = doc(db, 'rates', 'TDmXIypgLKKfNggHHSnw');

  const unsubscribe = onSnapshot(
    ratesDocRef,
    (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data) {
          purchasePrice.value = data.purchase_price || 0;
          salePrice.value = data.sale_price || 0;
          loading.value = false;
          error.value = null;
        }
      } else {
        error.value = 'No se encontró el documento de tasas de cambio';
        loading.value = false;
      }
    },
    (_err) => {
      error.value = 'Error al conectar con la base de datos. Recargando...';
      loading.value = false;
      setTimeout(() => window.location.reload(), 3000);
    }
  );

  const rates = computed(() => ({
    purchase: purchasePrice.value,
    sale: salePrice.value
  }));

  function convertToDollars(soles: number): number {
    if (!salePrice.value) return 0;
    return Math.round((soles / salePrice.value) * 100) / 100;
  }

  function convertToSoles(dollars: number): number {
    if (!purchasePrice.value) return 0;
    return Math.round((dollars * purchasePrice.value) * 100) / 100;
  }

  function $reset() {
    if (unsubscribe) {
      unsubscribe();
    }
  }

  onUnmounted(() => {
    $reset();
  });

  return {
    purchasePrice,
    salePrice,
    loading,
    error,
    rates,
    convertToDollars,
    convertToSoles,
    $reset
  };
});
