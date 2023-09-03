import { defineStore } from 'pinia';
import {api} from 'boot/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    nonce: null,
    signature: null,
    signedIn: false
  }),
  getters: {
    getNonce: (state) => this.nonce,
    getSignature: (state) => this.signature
  },
  actions: {
    setNonce(nonce) {
      this.nonce = nonce
    },
    setSignedIn(signedIn) {
      this.signedIn = signedIn
    },
    setSignature(signature) {
      this.signature = signature
    },
    async fetchNonce(address) {
      try{
        const response = await api.get('/nonce', { params: { address } });
        console.log('nonce response', response.data)
        this.setNonce(response.data.nonce);
      }
      catch (e){
        console.log(e);
      }
    },
    async sendSignature(address){
      try{
        const response = await api.post('/signature', {
          signature: this.signature,
          address
        });
        console.log(response);
      }
      catch (error){
        console.log(error);
      }
    }
  },
});
