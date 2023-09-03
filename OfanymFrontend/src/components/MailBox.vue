<template>
  <div class="column justify-evenly q-gutter-lg" >
    <div >
      <q-input outlined v-model="searchString" label="Text search" debounce="500" clearable />
      <q-tabs
        v-model="tab"
        dense
        :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-3'"
        align="justify"
        indicator-color="primary"
      >
        <q-tab name="inbox" label="Inbox" />
        <q-tab name="sent" label="Sent" />
      </q-tabs>
      <q-separator />
      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="inbox" label="Inbox" >
          <q-list>
            <q-card v-for="message in messageStore.inboxMessages"
                    :key="message.id"
                    @click="messageToggle(message.id, message.read, true)"
                    :class="messageStore.selectedMessage && messageStore.selectedMessage.id === message.id? 'shadow-5 q-ma-sm selectedcard':'q-ma-sm unselectedcard'"
            >
              <div class="row items-center no-wrap">
                <div class="col">
                <q-card-section>
                <div class="row justify-between">
                  <div class="text-h6">Title: {{ message.title }}</div>
                </div>
              </q-card-section>
              <q-card-section v-if="messageOpen(message.id)">
                <div class="row justify-between">
                  <div class="text-h6">{{ message.text }}
                    <q-btn icon="reply" color="green" @click="reply(message.id)" />
                  </div>
                </div>
              </q-card-section>
                </div>
                <div class="col-auto">
                  <q-btn icon="delete" flat round dense @click="deleteMessage(message.id)"/>
                </div>
              </div>
              <q-card-section class="column items-center q-pb-none">
                <div class="row justify-between">
                  <div>From:</div>
                  <div style="text-overflow: ellipsis;">{{ message.from }}</div>
                </div>
                <div style="text-overflow: ellipsis;">Sent: {{ date.formatDate(message.timestamp, "DD MMM YYYY, HH:mm") }}
                </div>
              </q-card-section>
            </q-card>
            <q-pagination
              v-model="currentInbox"
              max="5"
              direction-links
              gutter="20px"
            />
          </q-list>
        </q-tab-panel>
        <q-tab-panel name="sent" label="Sent">
          <q-list>
            <q-card v-for="message in messageStore.sentMessages"
                    :key="message.id"
                    @click="messageToggle(message.id, message.read, true)"
                    :class="messageStore.selectedMessage && messageStore.selectedMessage.id === message.id? 'shadow-5 q-ma-sm selectedcard':'q-ma-sm unselectedcard'"
            >
              <q-card-section>
                <div class="row justify-between">
                  <div class="text-h6">Title: {{ message.title }}</div>
                </div>
              </q-card-section>
              <q-card-section v-if="messageOpen(message.id)">
                <div class="row justify-between">
                  <div class="text-h6">{{ message.text }}
                  </div>
                </div>
              </q-card-section>
              <q-card-section class="column items-center q-pb-none">
                <div style="text-overflow: ellipsis;">To: {{ message.to }}</div>
                <div style="text-overflow: ellipsis;">Sent: {{ date.formatDate(message.timestamp, "DD MMM YYYY, HH:mm") }}
                </div>
              </q-card-section>
            </q-card>
            <q-pagination
              v-model="currentSent"
              max="5"
              direction-links
              gutter="20px"
            />
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
    </div>
    <div class="row justify-evenly q-gutter-lg">
      <q-btn fab icon="refresh" color="green" @click="loadMessages">Load Mail</q-btn>
      <q-btn fab icon="create" color="green" @click="toggleMessageDialog">Write Message</q-btn>
    </div>
    <div class="row justify-evenly q-gutter-lg">
      <q-input outlined v-model="email" label="Get message updates" v-if="authStore.signedIn" clearable
               type="email"
               bottom-slots
               @blur="updateEmailVerification"
               autofocus
               :error="showError"
               error-message="Please enter a valid email address."/>
      <q-btn fab icon="send" color="green" @click="emailSubscribe" v-if="authStore.signedIn">Subscribe</q-btn>
    </div>
  </div>
</template>

<script>
import {defineComponent, ref, watch, onMounted} from "vue";
import {useMessageStore} from "stores/message-store";
import {useAuthStore} from "stores/auth-store";
import {useWeb3Store} from "stores/web3-store";
import {date} from "quasar";
import NewMessageForm from "components/NewMessageForm.vue";
import {useQuasar} from "quasar";

// <q-card-section v-if="messageOpen(message.id)">
//   <div style="text-overflow: ellipsis;" @click="contractStore.selectContract(message.contract)">Related
//   contract: {{ message.contract }}
// </div>
// <div>{{ message.text }}</div>
// </q-card-section>
export default defineComponent({
  name: "MailBox",
  setup() {
    const currentPage = ref(1);
    const messageStore = useMessageStore();
    const authStore = useAuthStore();
    const web3Store = useWeb3Store();
    const searchString = ref('');
    const email = ref('');
    const showError = ref(false);
    const emailValid = ref(false);
    const currentInbox = ref(1);
    const currentSent = ref(1);
    const $q = useQuasar();
    const unread = () => {
      return messageStore.inboxMessages.filter(message => !message.read);
    };
    const openedMessages = ref([]);
    const messageOpen = (id) => openedMessages.value.includes(id);
    const messageToggle = (id, read, sent) => {
      console.log(id, read)
      if (messageOpen(id))
        openedMessages.value = openedMessages.value.filter((value) => {
          value !== id;
        });
      else
        openedMessages.value.push(id);
      if (!read && !sent)
        messageStore.readMessage(id, web3Store.account);
    };

    const changePage = async (pagination) => {
      console.log(pagination)
    }

    watch(searchString, async (searchString) => {
      await messageStore.setSearchString(searchString);
    })
    const loadMessages = async () => {
      try {
        await authStore.fetchNonce(web3Store.account);
        const signatureHash = await window.ethereum.request({
          "method": "personal_sign",
          "params": [
            authStore.nonce,
            web3Store.account
          ]
        });
        await messageStore.fetchMessages(web3Store.account, signatureHash, currentInbox.value, currentSent.value, searchString.value);
      } catch (e) {
        console.log('loading messages error: ', e)
      }
    };

    const deleteMessage = async (id) => {
      try {
        await authStore.fetchNonce(web3Store.account);
        const signatureHash = await window.ethereum.request({
          "method": "personal_sign",
          "params": [
            authStore.nonce,
            web3Store.account
          ]
        });
        await messageStore.deleteMessage(id, signatureHash, web3Store.account);
      } catch (e) {
        console.log('loading messages error: ', e)
      }
    };

    const emailSubscribe = async () => {
      try {
        await authStore.fetchNonce(web3Store.account);
        const signatureHash = await window.ethereum.request({
          "method": "personal_sign",
          "params": [
            authStore.nonce,
            web3Store.account
          ]
        });
        await messageStore.messageSubscribe(web3Store.account, signatureHash, email.value);
        $q.notify({
          message: "Subscription successful",
          color: "positive"
        });
      } catch (e) {
        console.log('loading messages error: ', e)
      }
    };

    const updateEmailVerification = () => {
      let reg =  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,24}))$/
      let valid = reg.test(email.value)
      if (valid) {
        console.log('email is valid')
        emailValid.value = true
        showError.value = false
      } else {
        console.log('email invalid')
        emailValid.value = false
        showError.value = true
      }
    }

    const toggleMessageDialog = () => {
      messageStore.sendMessageDialog = !messageStore.sendMessageDialog;
    }

    const reply = (id) => {
      const message = messageStore.inboxMessages.find(message => message.id === id);
      messageStore.newMessage = {
        title: `Re: ${message.title}`,
        text: "",
        to: message.from,
        timestamp: null,
        responseTo: message.id,
        contract: message.contract
      };
      messageStore.sendMessageDialog = true;
    }

    return {
      messageStore,
      authStore,
      web3Store,
      toggleMessageDialog,
      unread,
      date,
      messageToggle,
      messageOpen,
      openedMessages,
      searchString,
      currentPage,
      changePage,
      loadMessages,
      NewMessageForm,
      tab: ref('inbox'),
      deleteMessage,
      email,
      emailSubscribe,
      updateEmailVerification,
      emailValid,
      showError,
      reply,
      currentInbox,
      currentSent
    };
  },

});
</script>

<style lang="sass" scoped>
.selected-card
  border-color: red
  border-width: thick

.unselected-card
  border-color: green
  border-width: thin

.active
  border-color: green
  border-width: thick
</style>
