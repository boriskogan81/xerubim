<template>
  <q-layout view="lHh Lpr lFf">
    <MainHeader @toggleLeftDrawer="toggleLeftDrawer" @toggleRightDrawer="toggleRightDrawer" />
    <q-dialog v-model="messageStore.sendMessageDialog" v-on:hide="resetNewMessage">
      <NewMessageForm/>
    </q-dialog>
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="q-pa-md"
      side="left"
      :width="400"
    >
      <q-separator/>
      <q-input
        outlined
        v-model="searchString"
        label="Text search"
        debounce="500"
        clearable
      />
      <div class="q-pa-lg flex flex-center">
        <q-pagination
          v-model="contractStore.currentPage"
          color="blue"
          :max="contractStore.totalPages"
          :max-pages="contractStore.totalPages > 6? 6: contractStore.totalPages"
          boundary-numbers
          @update="changePage"
        />
      </div>
      <q-btn-toggle
        v-model="timelinessToggle"
        push
        glossy
        toggle-color="primary"
        :options="[
          {label: 'Current', value: 'current'},
          {label: 'Expired', value: 'expired'},
          {label: 'All', value: 'all'}
        ]"
        @update:model-value="changeTimeliness"
      />
      <q-option-group
        v-model="contractToggle"
        :options="options"
        color="primary"
        inline
        label="Select Contracts"
      />

      <q-separator/>
      <q-list>
        <q-card v-for="contract in contractStore.contracts"
                :key="contract.id"
                @click="contractStore.selectContract(contract.id)"
                :class="contractStore.selectedContract && contractStore.selectedContract.id === contract.id? 'shadow-5 q-ma-sm selectedcard':'q-ma-sm unselectedcard'"
        >
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6"
                 style="white-space: nowrap; width: 100%;overflow: hidden; -o-text-overflow: ellipsis;  text-overflow:ellipsis;">{{ contract.address }}
            </div>
          </q-card-section>
          <q-card-section>
            <div class="text-uppercase">{{ contract.data[3] }}</div>
            <div v-if="contractStore.selectedContract && contractStore.selectedContract.data[6] === 'open'"
                 class="active">ACTIVE
            </div>
          </q-card-section>
        </q-card>
      </q-list>
    </q-drawer>
    <q-drawer
      v-model="rightDrawerOpen"
      show-if-above
      bordered
      class="q-pa-md"
      side="right"
      :width="700"
    >
    <MailBox />
    </q-drawer>
    <q-page-container>
      <router-view style="width: 100vw;"/>
    </q-page-container>
  </q-layout>
</template>

<script>
import {defineComponent, ref, watch, onMounted} from "vue";
import {useContractStore} from "stores/contract-store";
import {useMessageStore} from "stores/message-store";
import {useAuthStore} from "stores/auth-store";
import {useWeb3Store} from "stores/web3-store";
import {date} from "quasar";
import MainHeader from "components/MainHeader.vue";
import MailBox from "components/MailBox.vue";
import NewMessageForm from "components/NewMessageForm.vue";

export default defineComponent({
  name: "MainLayout",
  components: {NewMessageForm, MainHeader, MailBox},
  setup() {
    const currentPage = ref(1);
    const leftDrawerOpen = ref(false);
    const rightDrawerOpen = ref(false);
    const messageDialogOpen = ref(false);
    const contractStore = useContractStore();
    const messageStore = useMessageStore();
    const authStore = useAuthStore();
    const web3Store = useWeb3Store();
    const searchString = ref('');
    const contractToggle = ref("allContracts");
    const timelinessToggle = ref("current");
    const unread = () => {
      return messageStore.inboxMessages.filter(message => !message.read);
    };
    const options = [
      {
        label: "All",
        value: "allContracts"
      },
      {
        label: "Contracts I've opened",
        value: "myContracts"
      },
      {
        label: "Contracts I'm working on",
        value: "inProgress"
      }
    ];
    const openedMessages = ref([]);
    const messageOpen = (id) => openedMessages.value.includes(id);
    const messageToggle = (id) => {
      if (messageOpen(id))
        openedMessages.value = openedMessages.value.filter((value) => {
          value !== id;
        });
      else
        openedMessages.value.push(id);
      if (!messageStore.inboxMessages.find(message => message.id === id).read)
        messageStore.readMessage(id);
    };

    const changePage = async (pagination) =>{
      console.log(pagination)
    }

    const changeTimeliness = async (value) => {
      await contractStore.updateQuery({...contractStore.contractQuery, timeliness: value})
    }

    watch(searchString, async (searchString) => {
      await contractStore.updateQuery({...contractStore.contractQuery, searchString, corners:contractStore.contractQuery.corners})
    })
    const loadMessages = async () => {
      try{
        await authStore.fetchNonce(web3Store.account);
        const signatureHash = await window.ethereum.request({
          "method": "personal_sign",
          "params": [
            authStore.nonce,
            web3Store.account
          ]
        });
        await messageStore.fetchMessages(web3Store.account, signatureHash);
      }
      catch(e){
        console.log('loading messages error: ', e)
      }
    };

    const resetNewMessage = () => {
      messageStore.newMessage = {
        title: "",
        text: "",
        to: "",
        timestamp: null,
        responseTo: 0,
        contract: 0
      };
    }

    return {
      contractStore,
      messageStore,
      authStore,
      web3Store,
      leftDrawerOpen,
      rightDrawerOpen,
      messageDialogOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value;
      },
      toggleRightDrawer() {
        rightDrawerOpen.value = !rightDrawerOpen.value;
      },
      toggleMessageDialog() {
        messageDialogOpen.value = !messageDialogOpen.value;
      },
      contractToggle,
      options,
      unread,
      date,
      messageToggle,
      messageOpen,
      openedMessages,
      searchString,
      currentPage,
      changePage,
      timelinessToggle,
      changeTimeliness,
      loadMessages,
      MailBox,
      NewMessageForm,
      resetNewMessage
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
