<template>
  <q-page class="flex flex-center">
    <q-dialog v-model="contractDialog" @hide="contractStore.selectContract(0)">
      <q-card v-if="contractStore.selectedContract">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ contractStore.selectedContract.task && contractStore.selectedContract.task }}</div>
          <q-space/>
          <q-btn icon="close" flat round dense v-close-popup/>
        </q-card-section>
        <q-card-section>
          <div>TASK: {{ contractStore.selectedContract.data[3] }}</div>
          <div class="text-uppercase">Pay: {{ fromWei(contractStore.selectedContract.data[2])}} eth
          </div>
          <div class="text-uppercase">Expires:
            {{
              new Date(parseInt(contractStore.selectedContract.data[5]) * 1000)
                .toLocaleDateString(undefined,
                  {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})
            }}
          </div>
          <div>FORMAT: {{ contractStore.selectedContract.data[4] }}</div>
          <div>MINIMAL LENGTH:
            {{ `${contractStore.selectedContract.data[7]} minute${parseInt(contractStore.selectedContract.data[7]) > 1 ? "s" : ""}` }}
          </div>
          <div>MINIMAL RESOLUTION:
            {{ contractStore.selectedContract.data[9] }}
          </div>
          <div :class="contractStore.selectedContract.data[6] === 'open' && 'active'">
            STATUS: {{ contractStore.selectedContract.data[6] }}
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn color="secondary" flat @click="fulfillmentFields = !fulfillmentFields">Fill Contract</q-btn>
        </q-card-actions>
        <q-card-section v-if="fulfillmentFields" class="q-pa-lg">
          <q-input outlined v-model="fulfillmentNotes" label="Please add notes on the contract" style="width: auto"/>
          <q-uploader
            url="http://localhost:3000/upload"
            label="Upload video/photo files"
            multiple
            batch
            style="margin: 2em; width: auto;"
            :form-fields="[{name: 'notes', value: fulfillmentNotes}, {name: 'contractId', value: contractStore.selectedContract && contractStore.selectedContract.id}]"
            @uploaded="onFileUpload"
            ref="uploader"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-dialog v-model="addContractDialog">
      <q-card style="min-width: 30vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">New Contract</div>
          <q-space/>
          <q-btn icon="close" flat round dense v-close-popup/>
        </q-card-section>
        <q-card-section>
          <q-form @submit="onSubmit">
            <q-input v-model="newContract.task"
                     label="Describe the task *"
                     lazy-rules
                     :rules="[ val => val && val.length > 0 || 'Please type something']"
            />
            <q-input v-model="newContract.pay"
                     label="Funding in wei *"
                     type="number"
                     lazy-rules
                     :rules="[ val => val && val.length > 0 || 'Please type something']"
            />
            <q-input filled label="Contract expiration date" v-model="newContract.expirationDate" mask="date"
                     :rules="['date']">
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy
                    ref="qDateProxy"
                    transition-show="scale"
                    transition-hide="scale"
                  >
                    <q-date v-model="newContract.expirationDate">
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="Close" color="primary" flat/>
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
            <q-select v-model="newContract.format"
                      label="Format *"
                      :options="formatOptions"
            />
            <q-input v-model="newContract.minimalLength"
                     label="Minimal length of video (minutes)"
                     type="number"
            />
            <q-select v-model="newContract.minimalResolution"
                      label="Minimal resolution *"
                      :options="resolutionOptions"
            />
            <div class="text-subtitle2" v-if="newContract.location.length > 0">Location set</div>
          </q-form>
        </q-card-section>
        <q-card-actions>
          <q-btn color="secondary" @click="startDrawing" flat>
            {{ newContract.location.length ? "Redraw Area" : "Draw area" }}
          </q-btn>
          <q-btn color="primary" v-if="newContract.location.length > 0" @click="onSubmit" flat>Add Contract</q-btn>
        </q-card-actions>
      </q-card>
    </q-dialog>
    <ol-map :loadTilesWhileAnimating="true"
            :loadTilesWhileInteracting="true"
            style="height:90vh; width: 80vw;"
            @moveend="moveEnd"
            ref="map">

      <ol-view ref="view" :center="center" :rotation="rotation" :zoom="zoom" :projection="projection"/>

      <ol-tile-layer>
        <ol-source-osm/>
      </ol-tile-layer>
      <ol-interaction-select @select="featureSelected" :condition="selectCondition" ref="selectInteraction">
        <ol-style>
          <ol-style-stroke color="red" :width="10"></ol-style-stroke>
          <ol-style-fill color="rgba(255,255,255,0.5)"></ol-style-fill>
        </ol-style>
      </ol-interaction-select>

      <ol-geolocation :projection="projection" @positionChanged="geoLocChange">
        <template v-slot="slotProps">
          <ol-vector-layer :zIndex="0">

            <ol-source-vector>
              <ol-interaction-draw v-if="drawEnable" :type="drawType" @drawend="drawEnd" @drawstart="drawStart">

              </ol-interaction-draw>
              <ol-feature ref="positionFeature">
                <ol-geom-point :coordinates="slotProps.position"></ol-geom-point>
                <ol-style>
                  <ol-style-icon :src="hereIcon" :scale="0.1"></ol-style-icon>
                </ol-style>
              </ol-feature>
              <ol-feature v-for="(contract, index) in contractStore.contracts" :key="index" :properties="contract"
                          ref="contracts">
                <ol-geom-polygon :coordinates="processCoords(contract.coordinates[0])"></ol-geom-polygon>
                <ol-style>
                  <ol-style-stroke color="green" :width="5"></ol-style-stroke>
                </ol-style>
              </ol-feature>
            </ol-source-vector>

          </ol-vector-layer>
        </template>
      </ol-geolocation>
    </ol-map>
    <q-page-sticky position="bottom-right" :offset="[36, 36]">
      <q-btn fab icon="add" color="blue" direction="up" @click="fabClick"/>
    </q-page-sticky>
  </q-page>
</template>

<script>
import hereIcon from "../assets/here.png";
import {
  ref,
  inject,
  defineComponent,
  onMounted
} from "vue";
import {useQuasar} from "quasar";
import {useContractStore} from "stores/contract-store";
import compiledFactory from "../../ethereum/build/MediaContractFactory.json";
import {api} from 'boot/axios';

const web3 = ref();
const factory = ref();

export default defineComponent({
  name: "IndexPage",
  setup() {
    const $q = useQuasar();
    const contractStore = useContractStore();
    const center = ref([40, 40]);
    const projection = ref("EPSG:4326");
    const zoom = ref(10);
    const rotation = ref(0);
    const format = inject("ol-format");
    const geoJson = new format.GeoJSON();
    const view = ref(null);
    const map = ref(null);
    const fulfillmentFields = ref(false);
    const newContract = ref({
      id: contractStore.contracts.length + 1,
      task: "",
      format: "",
      minimalLength: "",
      minimalResolution: "",
      pay: "",
      expirationDate: "",
      location: [],
      active: true
    });
    const geoLocChange = (loc) => {
      view.value.fit([loc[0], loc[1], loc[0], loc[1]], {
        maxZoom: 10
      });
    };

    const contractDialog = ref(false);
    const addContractDialog = ref(false);


    const selectConditions = inject("ol-selectconditions");

    const selectCondition = selectConditions.click;


    const clickedFeature = (event) => {
      if (event.selected.length === 1 && event.selected[0].values_.id) {
        contractStore.selectContract(event.selected[0].values_.id);
        contractDialog.value = true;
      }
    };

    const featureSelected = (event) => {
      clickedFeature(event);
    };

    const formatOptions = [
      "Photo", "Video"
    ];

    const resolutionOptions = [
      "480p", "720p", "1080p", "1440p", "4k", "8k"
    ];

    const connect = async () => {
      if (window && window.ethereum) {
        const conn = await window.ethereum.request({method: 'eth_requestAccounts'});
        return !!conn;
      } else {
        $q.notify({
          color: "red-5",
          textColor: "white",
          icon: "warning",
          message: "You need to set the contract location first"
        });
        return false;
      }
    };

    const processCoords = (coordArray) => {
      let processedCoords = coordArray.map(coord =>
        [coord.y, coord.x]
      )
      return [processedCoords];
    }

    const onSubmit = async () => {
      const conn = await connect();
      if (!(newContract.value.location.length > 0)) {
        $q.notify({
          color: "red-5",
          textColor: "white",
          icon: "warning",
          message: "You need to set the contract location first"
        });
      } else {
        try {
          addContractDialog.value = false;
          const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
          const account = accounts[0];
          const dismiss = $q.notify({
            spinner: true,
            message: 'Please wait...',
            timeout: 0
          });
          const getGasFeeForContractCall = async () => {
            const gasAmount = await factory.value.methods.createContract(
              Math.floor(new Date(newContract.value.expirationDate).getTime() / 1000),
              newContract.value.task,
              newContract.value.format,
              newContract.value.minimalLength,
              newContract.value.minimalResolution,
              JSON.stringify(newContract.value.location)
            ).estimateGas({from: account})
            const gasPrice = '100000';
            const pay = gasAmount * gasPrice;
            console.log(pay)
            return web3.value.utils.toBN(web3.value.utils.fromWei(pay.toString(), "ether"));
          };
          await factory.value.methods
            .createContract(
              Math.floor(new Date(newContract.value.expirationDate).getTime() / 1000),
              newContract.value.task,
              newContract.value.format,
              newContract.value.minimalLength,
              newContract.value.minimalResolution,
              JSON.stringify(newContract.value.location)
            )
            .send({
              from: account,
              gas: await getGasFeeForContractCall(),
              value: newContract.value.pay
            })
            .on('error', function (error, receipt) {
              console.log(error, receipt)
              dismiss();
              $q.notify({
                color: "red-4",
                textColor: "white",
                icon: "error_outline",
                message: "Contract creation failed"
              });
            });

          await api.get('/ingest')
          newContract.value = {
            id: contractStore.contracts.length + 1,
            task: "",
            format: "",
            minimalLength: "",
            minimalResolution: "",
            pay: "",
            expirationDate: "",
            location: [],
            active: true
          };
          dismiss();
          $q.notify({
            color: "green-4",
            textColor: "white",
            icon: "cloud_done",
            message: "Contract submitted"
          });
        } catch (e) {
          console.log(e)
        }
      }
    };

    const onFileUpload = () => {
      $q.notify({
        color: "green-5",
        textColor: "white",
        icon: "done",
        message: "Files have been uploaded and are processing"
      });
      setTimeout(() => {
        fulfillmentNotes.value = '';
        fulfillmentFields.value = false;
        contractDialog.value = false;
      }, 2000);
    };

    const fabClick = () => {
      addContractDialog.value = true;
    };

    const drawEnable = ref(false);

    const drawType = ref("Polygon");

    const drawStart = (event) => {
      console.log(event);
    };

    const drawEnd = (event) => {
      newContract.value.location = event.feature.values_.geometry.flatCoordinates.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / 2);

        if (!resultArray[chunkIndex]) {
          resultArray[chunkIndex] = []; // start a new chunk
        }

        resultArray[chunkIndex].push(item);

        return resultArray;
      }, []);
      drawEnable.value = false;
      addContractDialog.value = true;
    };

    const startDrawing = () => {
      if (newContract.value.location.length)
        newContract.value.location = [];
      drawEnable.value = true;
      addContractDialog.value = false;
    };

    const selectInteraction = ref(null);

    const sourceVector = ref(null);

    const contracts = ref(null);

    const fulfillmentNotes = ref('');

    const moveEnd = async (event) => {
      const corners = event.map.frameState_.extent;
      //console.log(corners);
      // console.log(event.map.getView().getCenter());
      await contractStore.updateQuery({...contractStore.contractQuery, corners})
    }

    const fromWei = (wei) => web3.value.utils.fromWei(wei, "ether")

    onMounted(() => {
      contractStore.$subscribe((mutation, state) => {
        if (state.selectedContract && state.selectedContract.id && ref(contracts)._value) {
          console.log(ref(contracts))
          const feature = ref(contracts)._value.find(value =>
            value.feature.values_.id === state.selectedContract.id
          ).feature;
          selectInteraction.value.select.getFeatures().clear();
          selectInteraction.value.select.getFeatures().push(feature);
          contractDialog.value = true;
        }
      });
      web3.value = new Web3(window.web3.currentProvider);
      factory.value = new web3.value.eth.Contract(
        compiledFactory.abi,
        '0xeF69217Db1560631Ad9274CaE93ae8C85A4Bc6c1'
      );
    });

    return {
      ref,
      center,
      projection,
      zoom,
      hereIcon,
      rotation,
      view,
      map,
      geoLocChange,
      featureSelected,
      selectConditions,
      selectCondition,
      fabClick,
      geoJson,
      contractDialog,
      addContractDialog,
      newContract,
      onSubmit,
      formatOptions,
      resolutionOptions,
      drawEnable,
      drawType,
      drawEnd,
      drawStart,
      startDrawing,
      contractStore,
      selectInteraction,
      sourceVector,
      contracts,
      fulfillmentFields,
      fulfillmentNotes,
      onFileUpload,
      moveEnd,
      processCoords,
      fromWei
    };
  }

});
</script>
<style lang="sass" scoped>
.active
  border-color: green
  border-width: thick
</style>
