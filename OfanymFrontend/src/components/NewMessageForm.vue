<template>
  <q-card style="min-width: 30vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Message</div>
      <q-space/>
      <q-btn icon="close" flat round dense v-close-popup/>
    </q-card-section>
    <q-card-section>
      <q-form @submit="onSubmit">
        <q-input v-model="messageStore.newMessage.title"
                 label="Subject"
                 lazy-rules
                 :rules="[ val => val && val.length > 0 || 'Please type something']"
        />
        <q-input v-model="messageStore.newMessage.to"
                 label="To:"
                 lazy-rules
                 :rules="[ val => val && val.length > 0 || 'Please type something']"
        />
        <q-input v-model="messageStore.newMessage.text"
                 label="Message"
                 lazy-rules
                 :rules="[ val => val && val.length > 0 || 'Please type something']"  type="textarea" />
      </q-form>
    </q-card-section>
    <q-card-actions>
      <q-btn color="primary" @click="onSubmit" flat>Send</q-btn>
    </q-card-actions>
  </q-card>

</template>

<script>
import {
  defineComponent
} from "vue";
import {api} from "boot/axios";
import {useQuasar} from "quasar";
import {useMessageStore} from "stores/message-store";
import {useAuthStore} from "stores/auth-store";
import {useWeb3Store} from "stores/web3-store";


export default defineComponent({
  name: "NewMessageForm",
  setup(props, context) {
    const $q = useQuasar();
    const messageStore = useMessageStore();
    const authStore = useAuthStore();
    const web3Store = useWeb3Store();

    const onSubmit = async () => {
      const message = messageStore.newMessage;
      message.from = web3Store.account;
      await authStore.fetchNonce(web3Store.account);
      const signatureHash = await window.ethereum.request({
        "method": "personal_sign",
        "params": [
          authStore.nonce,
          web3Store.account
        ]
      });
      console.log('posting', web3Store.account, signatureHash, message)
      await messageStore.postMessage(web3Store.account, signatureHash, message);
      messageStore.newMessage = {
        title: "",
        text: "",
        to: "",
        timestamp: null,
        responseTo: 0,
        contract: 0
      };
      $q.notify({
        message: "Message sent",
        color: "positive"
      });
      context.emit('close');
    };

    return {
      onSubmit,
      messageStore,
      authStore
    }
  }
})
</script>

<style scoped>

</style>
