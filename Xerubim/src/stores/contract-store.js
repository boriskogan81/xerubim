import { defineStore } from 'pinia';

export const useContractStore = defineStore('contracts', {
  state: () => ({
    contracts: [
      {
        id: 2,
        name: "Tel Aviv traffic jams",
        task: "Capture video footage of traffic jams in Tel Aviv",
        format: "Video",
        minimalLength: "1",
        minimalResolution: "1920 x 1080",
        specialInstructions: "Try to capture the location",
        pay: "0.13",
        expirationDate: "1-1-2023",
        location: [[34.742580, 32.046081],[34.760053,32.135796],[34.817236,32.127726],[34.783349,32.031719]],
        active: true
      },
      {
        id:1,
        name: "Shomron terror attacks",
        task: "Capture footage of terror attacks in Samaria",
        format: "Video or photo",
        minimalLength: "",
        minimalResolution: "4K",
        specialInstructions: "Any sort of terror attacks-shootings, rock throwing, Molotov cocktails",
        pay: "2",
        expirationDate: "1-2-2023",
        location: [[35.079394,32.473520],[35.215278,32.553901],[35.558028,32.406766],[35.553972,31.769289],[34.957707,31.827895],[34.951623,32.197629]],
        active: true
      }
    ],
    selectedContract: null
  }),
  getters: {
    getContracts: (state) => state.contracts,
  },
  actions: {
    addContract(contract) {
      this.contracts.push(contract);
    },
    setContracts(contracts) {
      this.contracts = contracts;
    },
    selectContract(id){
      this.selectedContract = this.contracts.find(contract => contract.id === id)
    }
  },
});
