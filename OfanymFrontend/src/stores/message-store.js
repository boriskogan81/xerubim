import { defineStore } from 'pinia';
import {api} from 'boot/axios';
import  {useAuthStore} from 'src/stores/auth-store';

const authStore = useAuthStore();

export const useMessageStore = defineStore('messages', {
  state: () => ({
    sendMessageDialog: false,
    inboxMessages: [],
    sentMessages: [],
    selectedMessage: null,
    currentInboxPage: 1,
    currentSentPage: 1,
    searchString: '',
    totalPages: 1,
    toPage: 1,
    fromPage: 1,
    pageSize: 10,
    toAddress: '',
    newMessage: {
        title: '',
        text: '',
        to: '',
        contract: 0,
        responseTo: 0,
    },

  }),
  getters: {
    getInboxMessages: (state) => state.inboxMessages,
    getSentMessages: (state) => state.sentMessages,
  },
  actions: {
    setInboxMessages(messages) {
      this.inboxMessages = messages;
    },
    setSentMessages(messages) {
      this.sentMessages = messages;
    },
    selectMessage(id){
      this.selectedMessage = this.messages.find(message => message.id === id);
    },
    async readMessage(id, address){
      try{
        await api.put('/messages/' + id + '/read', {
            id,
            address
        });
        this.setInboxMessages(this.inboxMessages.map(message => {
          if (message.id === id){
            message.read = true;
          }
          return message;
        }))
      }
      catch (error){
        console.log(error);
      }
    },
    async fetchMessages(address, signature, currentInbox, currentSent, searchString){
      try{
        const response = await api.get('/messages', {params: { address, signature, currentInbox, currentSent, searchString }});
        console.log('messages response', response.data)
        if(response.status === 200){
          authStore.setSignedIn(true);
          this.setTotalPages(response.data.totalPages);
          this.setPageSize(response.data.pageSize);
          this.setInboxMessages(response.data.inboxMessages);
          this.setSentMessages(response.data.sentMessages);
        }
      }
      catch (error){
        console.log(error);
      }
    },
    async postMessage(address, signature, message){
      console.log('post message', address, signature, message);
      try{
        const response = await api.post('/messages', { address, signature, message });
        if(response.status === 200){
          authStore.setSignedIn(true);
          this.setMessageDialog(false);
          this.newMessage = {
            title: '',
            text: '',
            to: '',
            contract: 0,
            responseTo: 0,
          }
        }
      }
      catch (error){
        console.log(error);
      }
    },
    async deleteMessage(id, signature, address){
      try{
        const response = await api.delete('/messages/',  {data:{ id, signature, address }});
        if(response.status === 200){
          authStore.setSignedIn(true);
          this.setInboxMessages(this.inboxMessages.filter(message => message.id !== id));
        }
        console.log(response);
      }
      catch (error){
        console.log(error);
      }
    },
    async messageSubscribe(address, signature, email){
      try{
        const response = await api.post('/messageSubscribe', { address, signature, email });
        if(response.status === 200){
          authStore.setSignedIn(true);
        }
      }
      catch (error){
        console.log(error);
      }
    },
    setSearchString(text) {
      this.searchString = text;
    },
    setCurrentInboxPage(page) {
      this.currentInboxPage = page;
    },
    setCurrentSentPage(page) {
      this.currentSentPage = page;
    },
    setTotalPages(pages) {
      this.totalPages = pages;
    },
    setPageSize(size) {
      this.pageSize = size;
    },
    setNewMessage(message){
      this.newMessage = message;
    },
    setMessageDialog(value){
      this.sendMessageDialog = value;
    }
  },
});
