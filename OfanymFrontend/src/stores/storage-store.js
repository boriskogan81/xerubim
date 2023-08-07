import {defineStore} from 'pinia';
import {api} from 'boot/axios';

export const useStorageStore = defineStore('storage', {
  state: () => ({
    contracts: [],
    selectedContract: null,
    contractQuery:{
      corners: [],
      searchString: '',
      currentPage: 1,
      totalPages: 1,
      pageSize: 10
    },
    corners: [],
    searchString: '',
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    newContract: {
      task: "",
      format: "",
      minimalLength: "",
      minimalResolution: "",
      pay: "",
      expirationDate: "",
      location: [],
      active: true,
      signature: ""
    }
  }),
  getters: {
    getContracts: (state) => state.contracts,
  },
  actions: {
    async addContract(contract) {

      this.contracts.push(contract);
    }
  },
});

