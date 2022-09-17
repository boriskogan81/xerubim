<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          Xerubim
        </q-toolbar-title>
        <div>v{{ version }}</div>
        <q-btn v-if="!connected" @click="connect">Connect Wallet</q-btn>
        <q-btn class="q-mr-lg" @click="toggleRightDrawer">
          <q-avatar color="red" v-if="unread().length" text-color="white">{{ unread().length }}</q-avatar>
          Messages
        </q-btn>
      </q-toolbar>
    </q-header>
    <q-dialog v-model="displayConnectPrompt" auto-close>
      <q-card>
        <q-card-section>
          <div class="text-h6">
            To use this application, please install and connect Metamask
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="q-pa-md"
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
      :width="400"
    >
      <q-list>
        <q-card v-for="message in messageStore.messages"
                :key="message.id"

                :class="messageStore.selectedMessage && messageStore.selectedMessage.id === message.id? 'shadow-5 q-ma-sm selectedcard':'q-ma-sm unselectedcard'"
        >
          <q-card-section>
            <div class="row justify-between">
              <div class="text-h6">{{ message.title }}</div>
              <q-btn @click="messageToggle(message.id)">{{ messageOpen(message.id) ? "Close" : "Open" }}</q-btn>
            </div>
          </q-card-section>
          <q-card-section class="column items-center q-pb-none">
            <div class="row justify-between">
              <div>From:</div>
              <div style="text-overflow: ellipsis;">{{ message.from }}</div>
            </div>

            <div style="text-overflow: ellipsis;">To: {{ message.from }}</div>
            <div style="text-overflow: ellipsis;">Sent: {{ date.formatDate(message.timestamp, "HH:mm DD-MMM-YYYY") }}
            </div>
          </q-card-section>
          <q-card-section v-if="messageOpen(message.id)">
            <div style="text-overflow: ellipsis;" @click="contractStore.selectContract(message.contract)">Related
              contract: {{ message.contract }}
            </div>
            <div>{{ message.text }}</div>
          </q-card-section>
        </q-card>
      </q-list>
    </q-drawer>
    <q-page-container>
      <router-view style="width: 100vw;"/>
    </q-page-container>
  </q-layout>
</template>

<script>
import {defineComponent, ref, watch} from "vue";
import json from "../../package.json";
import {useContractStore} from "stores/contract-store";
import {useMessageStore} from "stores/message-store";
import {date} from "quasar";

export default defineComponent({
  name: "MainLayout",
  data() {
    return {
      version: json.version
    };
  },

  setup() {
    const currentPage = ref(1);
    const leftDrawerOpen = ref(false);
    const rightDrawerOpen = ref(false);
    const connected = ref(false);
    const contractStore = useContractStore();
    const messageStore = useMessageStore();
    const searchString = ref('');
    const contractToggle = ref("allContracts");
    const unread = () => {
      return messageStore.messages.filter(message => !message.read);
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
      if (!messageStore.messages.find(message => message.id === id).read)
        messageStore.readMessage(id);
    };
    let displayConnectPrompt = ref(!connected.value);
    const connect = async () => {
      if (window && window.ethereum) {
        const conn = await window.ethereum.request({method: 'eth_requestAccounts'});
        if (conn)
          connected.value = true;
      }
    };

    const changePage = async (pagination) =>{
      console.log(pagination)
    }

    watch(searchString, async (searchString) => {
      await contractStore.updateQuery({...contractStore.contractQuery, searchString, corners:contractStore.contractQuery.corners})
    })
    return {
      contractStore,
      messageStore,
      leftDrawerOpen,
      rightDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value;
      },
      toggleRightDrawer() {
        rightDrawerOpen.value = !rightDrawerOpen.value;
      },
      contractToggle,
      options,
      unread,
      date,
      messageToggle,
      messageOpen,
      openedMessages,
      connected,
      connect,
      displayConnectPrompt,
      searchString,
      currentPage,
      changePage
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
