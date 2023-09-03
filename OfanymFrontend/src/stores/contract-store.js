import {defineStore} from 'pinia';
import {api} from 'boot/axios';

export const useContractStore = defineStore('contracts', {
  state: () => ({
    addContractDialog: false,
    drawEnable: false,
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
    timeliness: 'current',
    newContract: {
      task: "",
      format: "",
      minimalLength: "",
      minimalResolution: "",
      pay: "",
      expirationDate: "",
      location: [],
      active: true,
      signature: "",
      passphrase: ""
    }
  }),
  getters: {
    getContracts: (state) => state.contracts,
    getSearchString: (state) => state.searchString,
    getCurrentPage: (state) => state.currentPage,
    getTotalPages: (state) => state.totalPages,
    getPageSize: (state) => state.pageSize,
    getNewContract: (state) => state.newContract
  },
  actions: {
    addContractDialogToggle(bool) {
      this.addContractDialog = bool;
    },
    async addContract(contract) {
      this.contracts.push(contract);
    },
    setContracts(contracts) {
      this.contracts = contracts;
    },
    selectContract(id) {
      this.selectedContract = this.contracts.find(contract => contract.id === id)
    },
    setSearchString(text) {
      this.searchString = text;
    },
    setCurrentPage(page) {
      this.currentPage = page;
    },
    setTotalPages(pages) {
      this.totalPages = pages;
    },
    setPageSize(size) {
      this.pageSize = size;
    },
    setNewContract(contract){
      this.newContract = contract;
    },
    setDrawEnable(bool){
      this.drawEnable = bool;
    },

    async updateQuery(query){
      this.contractQuery = query;
      try {
        const contracts = await api.get('/contracts', {
          params: query
        })
        const rectifiedContracts = contracts.data.contracts.map(contract => {
          contract.coordinates = processCoords(contract.coordinates[0]);
          return contract
        })

        this.setContracts(rectifiedContracts);
        this.setCurrentPage(contracts.data.pagination.page);
        this.setTotalPages(contracts.data.pagination.pageCount);
        this.setPageSize(contracts.data.pagination.pageSize);
      } catch (e) {
        console.log(e);
      }
    }
  },
});

const processCoords = (coordArray) => {
  let processedCoords = coordArray.map(coord =>
    [coord.x, coord.y]
  )
  return [processedCoords];
}
