<template>
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
        Ofanym
      </q-toolbar-title>
      <div>v{{ version }}</div>
      <q-btn class="q-mr-lg" v-if="isPlatform">
        Contract Table
      </q-btn>
      <q-btn class="q-mr-lg" @click="toggleRightDrawer">
        <q-avatar color="red" v-if="unread() && unread().length" text-color="white">{{ unread().length }}</q-avatar>
        Messages
      </q-btn>
    </q-toolbar>
  </q-header>
  <q-dialog v-model="displayConnectPrompt" v-if="!web3Store.connected" auto-close>
    <q-card>
      <q-card-section>
        <div class="text-h6">
          To use this application, please install and connect Metamask
        </div>
        <q-btn v-if="!web3Store.connected" @click="connect">Connect Wallet</q-btn>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import {
  defineComponent, onMounted,
  ref
} from "vue";
import {useMessageStore} from "stores/message-store";
import json from "app/package.json";
import {useWeb3Store} from "stores/web3-store";
import {useQuasar} from "quasar";
import {platform} from "../../config/web3.json";
export default defineComponent({
  name: "MainHeader",
  data() {
    return {
      version: json.version
    };
  },
  setup(props, context) {
    const web3Store = useWeb3Store();
    const $q = useQuasar();
    const messageStore = useMessageStore();
    const isPlatform = ref(false);
    const toggleLeftDrawer = () => context.emit('toggleLeftDrawer');
    const toggleRightDrawer = () => context.emit('toggleRightDrawer');
    const connect = async () => {
      const failConnect = () => {
        $q.notify({
          color: "red-5",
          textColor: "white",
          icon: "warning",
          message: "Please connect with Metamask"
        });
        return false;
      }
      if (window && window.ethereum) {
        const connected = await window.ethereum.request({method: 'eth_accounts'});
        console.log(connected)
        if (connected.length > 0) {
          await web3Store.setConnection(true);
          await web3Store.setAccount((connected[0]));
          return true;
        } else {
          failConnect()
        }
      } else {
        failConnect()
      }
    };
    const unread = () => {
      return messageStore.inboxMessages && messageStore.inboxMessages.filter(message => !message.read);
    };
    let displayConnectPrompt = ref(!web3Store.connected);

    onMounted(async() => {
      await web3Store.setup();
      isPlatform.value = web3Store.account && web3Store.account.toLowerCase() === platform.toLowerCase();
    });
    return {
      toggleLeftDrawer,
      toggleRightDrawer,
      connect,
      unread,
      displayConnectPrompt,
      web3Store,
      isPlatform
    }
  }
})
</script>

<style scoped>

</style>
