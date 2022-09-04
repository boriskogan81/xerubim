import { defineStore } from 'pinia';

export const useMessageStore = defineStore('messages', {
  state: () => ({
    messages: [
      {
        id: 1,
        title: "Welcome to Xerubim",
        text: "This is your welcome message",
        from: '0x500694d00eFc0315Cac629b83Dfd11C8b038AfAa',
        to: '0x500694d00eFc0315Cac629b83Dfd11C8b038AfAb',
        contract: 1,
        responseTo: null,
        timestamp: 1661978540165,
        read: false
      },
      {
        id: 2,
        title: "Footage uploaded",
        text: "Footage has been uploaded to your contract",
        from: '0x500694d00eFc0315Cac629b83Dfd11C8b038AfAb',
        to: '0x500694d00eFc0315Cac629b83Dfd11C8b038AfAa',
        contract: 1,
        responseTo: null,
        timestamp: 1661978540165,
        read: false
      },
      {
        id: 3,
        title: "Footage uploaded",
        text: "No way, dude, that footage sucks, you can't see anything!",
        from: '0x500694d00eFc0315Cac629b83Dfd11C8b038AfAb',
        to: '0x500694d00eFc0315Cac629b83Dfd11C8b038AfAa',
        contract: 2,
        responseTo: 2,
        timestamp: 1661978540165,
        read: true
      }
    ],
    selectedMessage: null
  }),
  getters: {
    getMessages: (state) => state.messages,
  },
  actions: {
    addMessage(message) {
      this.messages.push(message);
    },
    setMessages(messages) {
      this.messages = messages;
    },
    selectMessage(id){
      this.selectedMessage = this.messages.find(message => message.id === id);
    },
    readMessage(id){
      const updatedMessage = {...this.messages.find(message => message.id === id), read: true};
      this.messages = this.messages.map(message => message.id === id? updatedMessage : message)
    }
  },
});
