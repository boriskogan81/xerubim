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
        <q-btn class="q-mr-lg" @click="toggleRightDrawer">
          <q-avatar color="red" v-if="unread().length" text-color="white">{{ unread().length }}</q-avatar>
          Messages
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="q-pa-md"
    >
      <q-separator />
      <q-input outlined v-model="textSearch" label="Text search" />
      <q-option-group
        v-model="contractToggle"
        :options="options"
        color="primary"
        inline
        label="Select Contracts"
      />
      <q-separator />
      <q-list>
        <q-card v-for="contract in contractStore.contracts"
                :key="contract.id"
                @click="contractStore.selectContract(contract.id)"
                :class="contractStore.selectedContract && contractStore.selectedContract.id === contract.id? 'shadow-5 q-ma-sm selectedcard':'q-ma-sm unselectedcard'"
        >
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">{{ contract.name }}</div>
          </q-card-section>
          <q-card-section>
            <div class="text-uppercase">{{ contract.task }}</div>
            <div v-if="contractStore.selectedContract && contractStore.selectedContract.active" class="active">ACTIVE
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
          <q-card-section >
            <div class="row justify-between">
              <div class="text-h6">{{ message.title }}</div>
              <q-btn @click="messageToggle(message.id)">{{ messageOpen(message.id) ? "Close" : "Open" }}</q-btn>
            </div>
          </q-card-section>
          <q-card-section class="column items-center q-pb-none">
            <div class="row justify-between">
              <div>From: </div>
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
      <router-view style="width: 100vw;" />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from "vue";
import json from "../../package.json";
import { useContractStore } from "stores/contract-store";
import { useMessageStore } from "stores/message-store";
import { date } from "quasar";

export default defineComponent({
  name: "MainLayout",
  data() {
    return {
      version: json.version
    };
  },

  setup() {
    const leftDrawerOpen = ref(false);
    const rightDrawerOpen = ref(false);
    const contractStore = useContractStore();
    const messageStore = useMessageStore();
    const textSearch = "";
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
      textSearch,
      contractToggle,
      options,
      unread,
      date,
      messageToggle,
      messageOpen,
      openedMessages
    };
  }
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
