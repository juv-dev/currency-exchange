<script setup lang="ts">
import { ref, onUnmounted, watch, nextTick, computed, onMounted } from 'vue';
import { useExchangeStore } from '~/stores/exchange';

const inputRef = ref<HTMLInputElement | null>(null);

const exchangeStore = useExchangeStore();
const activeTab = ref<string>('Compra'); // Default to 'Compra' tab
const internalAmount = ref<string>('');
const displayAmount = ref<string>('');

// Initialize with default values
const initializeAmounts = () => {
  const defaultValue = activeTab.value === 'Compra' 
    ? exchangeStore.purchasePrice?.toFixed(3)
    : exchangeStore.salePrice?.toFixed(3);
  internalAmount.value = defaultValue;
  displayAmount.value = defaultValue;
};

const amount = computed<string>({
  get: (): string => displayAmount.value,
  set: (value: string): void => {
    displayAmount.value = value;
    internalAmount.value = value;
  }
});
// Siempre comenzamos con Dólares en el campo de envío
const fromCurrency = ref<string>('USD');
const toCurrency = ref<string>('PEN');
const toAmount = ref<number | null>(null);
const showConvertedAmount = ref(false);

const adjustInputWidth = () => {
  if (inputRef.value) {
    inputRef.value.style.width = '0';
    inputRef.value.style.width = `${inputRef.value.scrollWidth}px`;
  }
};

const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  let value = input.value;
  
  // Store cursor position
  const cursorPosition = input.selectionStart || 0;
  
  // Remove any non-digit or non-decimal point characters
  value = value.replace(/[^\d.]/g, '');
  
  // Handle multiple decimal points
  const decimalSplit = value.split('.');
  if (decimalSplit.length > 2) {
    // If more than one decimal point, keep only the first one
    value = `${decimalSplit[0]}.${decimalSplit.slice(1).join('')}`;
  }
  
  // Limit to 2 decimal places
  if (decimalSplit.length === 2 && decimalSplit[1].length > 2) {
    value = `${decimalSplit[0]}.${decimalSplit[1].substring(0, 2)}`;
  }
  
  // Update both display and internal values
  internalAmount.value = value;
  displayAmount.value = value;
  
  // Eliminar cualquier caracter que no sea número o punto decimal
  value = value.replace(/[^0-9.]/g, '');
  
  // Asegurar que solo haya un punto decimal
  const parts = value.split('.');
  if (parts.length > 2) {
    value = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limitar a 2 decimales después del punto
  if (parts.length === 2) {
    parts[1] = parts[1].substring(0, 2);
    value = parts.join('.');
  }
  
  // No permitir que el punto sea el primer carácter
  if (value === '.') {
    value = '0.';
  }
  
  // Validar que el número no sea mayor a 999,999
  const numericValue = parseFloat(value);
  if (!isNaN(numericValue) && numericValue > 999999) {
    value = '999999';
  }
  
  // Actualizar el valor solo si es un número válido o está vacío
  if (value === '' || !isNaN(Number(value))) {
    // Si el nuevo valor es diferente al anterior, actualizamos
    if (input) {
      // Solo actualizamos el display si el valor cambió
      if (input.value !== value) {
        input.value = value;
      }
      // Restaurar la posición del cursor
      nextTick(() => {
        if (input) {
          input.setSelectionRange(cursorPosition, cursorPosition);
        }
      });
    }
    amount.value = value;
  } else {
    // Si el valor no es válido, restaurar el valor anterior
    input.value = amount.value as string;
  }
  
  showConvertedAmount.value = false;
  nextTick(() => {
    adjustInputWidth();
  });
};

const calculateToAmount = (): number => {
  if (!internalAmount.value || isNaN(parseFloat(internalAmount.value))) return 0;

  const amountNum = parseFloat(internalAmount.value);
  
  // Usar las funciones del store para las conversiones
  if (fromCurrency.value === 'PEN' && toCurrency.value === 'USD') {
    // En modo Venta, convertir Soles a Dólares usando el precio de venta
    if (activeTab.value === 'Venta') {
      return amountNum / exchangeStore.salePrice;
    }
    // En modo Compra, usar la función del store
    return exchangeStore.convertToDollars(amountNum);
  } 
  // Convertir de Dólares a Soles
  else if (fromCurrency.value === 'USD' && toCurrency.value === 'PEN') {
    // En modo Venta, convertir Dólares a Soles usando el precio de venta
    if (activeTab.value === 'Venta') {
      return amountNum * exchangeStore.salePrice;
    }
    // En modo Compra, usar la función del store
    return exchangeStore.convertToSoles(amountNum);
  }
  
  return 0; // Caso por defecto, no debería ocurrir
};

const setActiveTab = (tab: string): void => {
  activeTab.value = tab;
  amount.value = tab === 'Compra' 
    ? exchangeStore.purchasePrice.toFixed(3)
    : exchangeStore.salePrice.toFixed(3);

  // Ajustar las monedas según la pestaña seleccionada
  if (tab === 'Venta') {
    fromCurrency.value = 'PEN';
    toCurrency.value = 'USD';
  } else {
    fromCurrency.value = 'USD';
    toCurrency.value = 'PEN';
  }

  // Recalcular si hay un monto mostrado
  if (showConvertedAmount.value && amount.value) {
    toAmount.value = calculateToAmount();
  }
};

const swapCurrencies = (): void => {
  // Cambiamos entre Compra y Venta
  activeTab.value = activeTab.value === 'Compra' ? 'Venta' : 'Compra';

  // Si estamos en Venta, aseguramos que Soles esté primero
  if (activeTab.value === 'Venta' && fromCurrency.value === 'USD') {
    fromCurrency.value = 'PEN';
    toCurrency.value = 'USD';
  }
  // Si estamos en Compra, aseguramos que Dólares esté primero
  else if (activeTab.value === 'Compra' && fromCurrency.value === 'PEN') {
    fromCurrency.value = 'USD';
    toCurrency.value = 'PEN';
  }

  // Recalculamos si hay un monto mostrado
  if (showConvertedAmount.value && amount.value) {
    toAmount.value = calculateToAmount();
  } else {
    toAmount.value = null;
    showConvertedAmount.value = false;
  }
};

// Calcular el monto solo cuando se inicia la operación
const startOperation = (): void => {
  if (!internalAmount.value) return;

  // Realizar el cálculo sin modificar el display
  const result = calculateToAmount();
  toAmount.value = result;
  showConvertedAmount.value = true;
  
  // Forzar el ancho del input para mantener la consistencia
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.style.width = 'auto'; // Reset width to auto to allow recalculation
      adjustInputWidth();
    }
  });
  
  // Forzar el recálculo del ancho después de la operación
  nextTick(() => {
    adjustInputWidth();
  });
};

// Actualizar cuando cambian las tasas de cambio
watch(() => [exchangeStore.purchasePrice, exchangeStore.salePrice], () => {
  if (showConvertedAmount.value) {
    toAmount.value = calculateToAmount();
  }
});


// Watch for when loading is complete to set initial values
const loadingWatcher = ref<() => void>();

// Initialize the watcher in onMounted to avoid circular dependencies
onMounted(() => {
  loadingWatcher.value = watch(
    () => !exchangeStore.loading, 
    (isLoaded) => {
      if (isLoaded) {
        // Set initial amount based on active tab
        initializeAmounts();
        
        // Calculate initial conversion
        toAmount.value = calculateToAmount();
        showConvertedAmount.value = true;
        
        // Stop watching once we've set the initial values
        if (loadingWatcher.value) {
          loadingWatcher.value();
        }
      }
    }, 
    { immediate: true }
  );
});

// Also handle tab changes
watch(activeTab, () => {
  if (!exchangeStore.loading) {
    amount.value = activeTab.value === 'Compra' 
      ? exchangeStore.purchasePrice.toFixed(3)
      : exchangeStore.salePrice.toFixed(3);
    toAmount.value = calculateToAmount();
  }
});

// Clean up on unmount
onUnmounted(() => {
  exchangeStore.$reset();
});
</script>

<template>
  <div class="w-full md:rounded-[8px] bg-white shadow-lg overflow-hidden pt-[21px] mx-[-16px] min-w-[100vw] md:max-w-[386px] md:min-w-[386px] md:mx-auto">
    <!-- Estado de carga -->
    <div v-if="exchangeStore.loading" class="text-center py-4" role="status" aria-live="polite">
      <div class="animate-pulse flex flex-col items-center">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <span class="sr-only">Cargando tipos de cambio...</span>
    </div>

    <div v-else-if="exchangeStore.error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
      <p class="font-bold">Error</p>
      <p>{{ exchangeStore.error }}</p>
    </div>

    <div v-else class="flex flex-col">
      <div class="flex justify-evenly mb-4 border-b-[1px] border-[#E7E7ED] border-solid">
        <button v-for="tab in ['Compra', 'Venta']" :key="tab" @click="setActiveTab(tab)"
          :class="`flex flex-col  text-[12px] m transition-colors ${activeTab == tab ? 'text-[#2F00FF]': 'text-[#717191]'}`">
          <span class="font-medium">{{ tab === 'Compra' ? 'Dolár compra' : 'Dolár venta' }}</span>
          <span :class="`font-bold pb-[6px]  ${activeTab === tab ? 'border-b ' : ''}`">
            {{ tab === 'Compra' ? exchangeStore.purchasePrice.toFixed(3) : exchangeStore.salePrice.toFixed(3)}}</span>
        </button>
      </div>

      <div class="space-y-6 p-6">
 
        <div class="space-y-4">
          <!-- From Currency -->
          <div class="border border-[#6E46E6] rounded-[6px] flex max-w-[327px] md:max-w-[300px] h-[45px] mx-auto">
            <div class="text-[15px] bg-[#F3F3F6] rounded-l-[6px] text-[#6E46E6] w-[100px] flex items-center justify-center px-2">
              {{ fromCurrency === 'PEN' ? 'Soles' : 'Dólares' }}
            </div>
            <div class="flex-1 px-2 pt-[4px] flex flex-col items-end">
              <p class="text-[12px] text-[#717191] w-full text-right min-w-[100px] mb-[-5px]">Envías</p>
              <div class="relative w-full flex justify-end">
                <div class="relative flex items-center">
                  <span :class="`absolute text-[16px] text-gray-600 pointer-events-none ${fromCurrency === 'PEN' ? 'left-[7px]' : 'left-[12px]'}`">
                    {{ fromCurrency === 'PEN' ? 'S/' : '$' }}
                  </span>
                  <input
                    ref="inputRef"
                    v-model="amount"
                    type="text"
                    inputmode="decimal"
                    class="placeholder:text-[#3D3D67] text-[#3D3D67] text-right text-[16px] border-none outline-none focus:outline-none ring-none p-0 m-0 bg-transparent pl-6"
                    :style="{
                      'width': amount ? `${activeTab === 'Venta' ? 66 : Math.min(Math.max(amount.toString().length * 9 + 20, 60), 82)}px` : '60px',
                      'max-width': '200px',
                      'min-width': '60px'
                    }"
                    @input="handleInput"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Swap Button -->
          <div class="flex justify-center mt-[-30px] mb-[-13px] md:mb-[-13px]">
            <button @click="swapCurrencies"
              class="bg-purple rotate-custom hover:bg-purple-700 text-white rounded-full p-[10px] shadow-lg transition-colors">
              <svg class="md:w-[28px] md:h-[28px]" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.70142 11.7891C2.72845 10.6079 2.97173 9.46175 3.42855 8.38321C3.89618 7.27495 4.56655 6.28291 5.42073 5.42603C6.2749 4.56915 7.26964 3.89879 8.37791 3.43115C9.52402 2.9473 10.7404 2.70132 11.9973 2.70132C13.2543 2.70132 14.4707 2.9473 15.6141 3.43115C16.7192 3.89783 17.7227 4.57542 18.5686 5.42603C18.8362 5.69364 19.0875 5.97747 19.32 6.27481L17.6928 7.54526C17.6606 7.57016 17.636 7.60365 17.622 7.64187C17.608 7.68009 17.6051 7.72149 17.6136 7.7613C17.622 7.80112 17.6416 7.83773 17.6699 7.86694C17.6983 7.89614 17.7343 7.91675 17.7738 7.92639L22.5232 9.08872C22.6583 9.12116 22.7908 9.01844 22.7908 8.88058L22.8124 3.99069C22.8124 3.80959 22.6043 3.70687 22.4637 3.8204L20.9392 5.01246C18.8605 2.35262 15.6276 0.646973 11.9946 0.646973C5.80186 0.646973 0.763304 5.60984 0.647071 11.7783C0.646349 11.8071 0.65141 11.8358 0.661954 11.8627C0.672497 11.8896 0.688312 11.9141 0.708464 11.9347C0.728617 11.9554 0.752701 11.9718 0.779296 11.983C0.805891 11.9942 0.834459 12 0.863318 11.9999H2.48517C2.60411 11.9999 2.69872 11.9053 2.70142 11.7891ZM23.1368 11.9999H21.5149C21.396 11.9999 21.3014 12.0946 21.2987 12.2108C21.2716 13.392 21.0284 14.5381 20.5715 15.6167C20.1039 16.7249 19.4335 17.7197 18.5794 18.5739C17.7172 19.4396 16.6922 20.126 15.5635 20.5937C14.4347 21.0613 13.2245 21.3009 12.0027 21.2986C10.7814 21.3009 9.57163 21.0613 8.44332 20.5936C7.31501 20.126 6.29048 19.4395 5.42884 18.5739C5.16123 18.3063 4.90984 18.0224 4.67738 17.7251L6.30464 16.4546C6.33683 16.4297 6.36135 16.3962 6.37536 16.358C6.38937 16.3198 6.39231 16.2784 6.38383 16.2386C6.37536 16.1988 6.35583 16.1622 6.32747 16.133C6.29911 16.1038 6.26309 16.0831 6.22354 16.0735L1.47422 14.9112C1.33906 14.8787 1.20661 14.9815 1.20661 15.1193L1.18769 20.0119C1.18769 20.193 1.39583 20.2957 1.53639 20.1822L3.06093 18.9901C5.13961 21.6473 8.3725 23.3529 12.0055 23.3529C18.2009 23.3529 23.2368 18.3873 23.353 12.2216C23.3537 12.1928 23.3487 12.164 23.3381 12.1372C23.3276 12.1103 23.3118 12.0858 23.2916 12.0652C23.2715 12.0445 23.2474 12.0281 23.2208 12.0169C23.1942 12.0057 23.1656 11.9999 23.1368 11.9999Z" fill="white"/>
              </svg>
            </button>
          </div>

          <!-- To Currency -->
          <div class="border border-[#6E46E6] rounded-[6px] flex max-w-[327px] md:max-w-[300px] h-[45px] mx-auto">
            <div class="text-[15px] bg-[#F3F3F6] rounded-l-[6px] text-[#6E46E6] w-[100px] flex items-center justify-center px-2">
              {{ toCurrency === 'PEN' ? 'Soles' : 'Dólares' }}
            </div>
            <div class="flex-1 px-2 pt-[4px] flex flex-col items-end">
              <p class="text-[12px] text-[#717191] w-full text-right min-w-[100px] mb-[-5px]">Recibes</p>
              <div class="relative w-full flex justify-end">
                <div class="relative flex items-center">
                  <span v-if="showConvertedAmount && toAmount !== null" :class="` text-right text-[16px] p-0 m-0 bg-transparent pl-6`">
                    {{ toCurrency === 'PEN' ? 'S/ ' : '$ ' }}{{ toAmount.toFixed(2) }}
                  </span>
                  <span v-else class="text-[#3D3D67]  text-right text-[16px] p-0 m-0 bg-transparent pl-6">  
                    {{ toCurrency === 'PEN' ? 'S/ 0.00' : '$ 0.00' }}</span>
                </div>
              </div>
            </div>
           
            
          </div>

          <button @click="startOperation"
            :disabled="!amount || (typeof amount === 'string' ? !amount.trim() || parseFloat(amount) <= 0 : amount <= 0)"
            class="flex items-center justify-center bg-purple hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed border border-[#4A28AF]  text-white font-medium py-[10px] rounded-[6px] mt-8 transition-colors text-[16px] w-[327px] mx-auto">
            Iniciar operación
          </button>
        </div>
      </div>
  </div>
  </div>
</template>
