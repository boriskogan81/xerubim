<template>
  <q-page class="flex flex-center">
    <q-dialog v-model="contractDialog">
      <q-card v-if="store.selectedContract">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ store.selectedContract.name && store.selectedContract.name }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="text-uppercase">Name: {{ store.selectedContract.name && store.selectedContract.name }}</div>
          <div class="text-uppercase">Pay: {{ store.selectedContract.pay && store.selectedContract.pay }} eth</div>
          <div class="text-uppercase">Expires:
            {{ store.selectedContract.expirationDate && store.selectedContract.expirationDate }}
          </div>
          <div>TASK: {{ store.selectedContract.task && store.selectedContract.task }}</div>
          <div>SPECIAL INSTRUCTIONS:
            {{ store.selectedContract.specialInstructions && store.selectedContract.specialInstructions }}
          </div>
          <div>FORMAT: {{ store.selectedContract.format && store.selectedContract.format }}</div>
          <div>MINIMAL LENGTH:
            {{ store.selectedContract.minimalLength && `${store.selectedContract.minimalLength} minute` }}
            {{ store.selectedContract.minimalLength && store.selectedContract.minimalLength > 1 ? "s" : "" }}
          </div>
          <div>MINIMAL RESOLUTION:
            {{ store.selectedContract.minimalResolution && store.selectedContract.minimalResolution }}
          </div>
          <div v-if="store.selectedContract && store.selectedContract.active" class="active">ACTIVE</div>
        </q-card-section>
        <q-card-actions>
          <q-btn color="secondary" flat @click="fulfillmentFields = !fulfillmentFields">Fill Contract</q-btn>
        </q-card-actions>
        <q-card-section v-if="fulfillmentFields" class="q-pa-lg">
          <q-input outlined v-model="fulfillmentNotes" label="Please add notes on the contract" style="width: auto" />
          <q-uploader
            url="http://localhost:3000/upload"
            label="Upload video/photo files"
            multiple
            batch
            style="margin: 2em; width: auto;"
            :form-fields="[{name: 'notes', value: fulfillmentNotes}, {name: 'contractId', value: store.selectedContract && store.selectedContract.id}]"
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
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-form @submit="onSubmit">
            <q-input v-model="newContract.name"
                     label="Contract name *"
                     lazy-rules
                     :rules="[ val => val && val.length > 0 || 'Please type something']"
            />
            <q-input v-model="newContract.pay"
                     label="Pay in eth*"
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
                        <q-btn v-close-popup label="Close" color="primary" flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
            <q-input v-model="newContract.task"
                     label="Task *"
                     lazy-rules
                     :rules="[ val => val && val.length > 0 || 'Please type something']"
            />
            <q-input v-model="newContract.specialInstructions"
                     label="Special instructions"
            />
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

      <ol-view ref="view" :center="center" :rotation="rotation" :zoom="zoom" :projection="projection" />

      <ol-tile-layer>
        <ol-source-osm />
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
              <ol-feature v-for="(contract, index) in store.contracts" :key="index" :properties="contract"
                          ref="contracts">
                <ol-geom-polygon :coordinates="[contract.location]"></ol-geom-polygon>
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
      <q-btn fab icon="add" color="blue" direction="up" @click="fabClick" />
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
import { useQuasar } from "quasar";
import { useContractStore } from "stores/contract-store";
import json from "../../package.json";

export default defineComponent({
  name: "IndexPage",
  setup() {
    const $q = useQuasar();
    const store = useContractStore();
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
      id: store.contracts.length + 1,
      name: "",
      task: "",
      format: "",
      minimalLength: "",
      minimalResolution: "",
      specialInstructions: "",
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
        store.selectContract(event.selected[0].values_.id);
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

    const onSubmit = () => {
      if (!(newContract.value.location.length > 0)) {
        $q.notify({
          color: "red-5",
          textColor: "white",
          icon: "warning",
          message: "You need to set the contract location first"
        });
      } else {
        addContractDialog.value = false;
        store.addContract({ ...newContract.value });
        newContract.value = {
          id: store.contracts.length + 1,
          name: "",
          task: "",
          format: "",
          minimalLength: "",
          minimalResolution: "",
          specialInstructions: "",
          pay: "",
          expirationDate: "",
          location: [],
          active: true
        };
        $q.notify({
          color: "green-4",
          textColor: "white",
          icon: "cloud_done",
          message: "Contract submitted"
        });
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

    const moveEnd = (event) => {
      console.log(event.map.frameState_.extent);
      console.log(event.map.getView().getCenter())
    }

    onMounted(() => {
      store.$subscribe((mutation, state) => {
        if (state.selectedContract && state.selectedContract.id) {
          const feature = ref(contracts)._value.find(value =>
            value.feature.values_.id === state.selectedContract.id
          ).feature;
          selectInteraction.value.select.getFeatures().clear();
          selectInteraction.value.select.getFeatures().push(feature);
          contractDialog.value = true;
        }
      });
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
      store,
      selectInteraction,
      sourceVector,
      contracts,
      fulfillmentFields,
      fulfillmentNotes,
      onFileUpload,
      moveEnd
    };
  }

});
</script>
<style lang="sass" scoped>
.active
  border-color: green
  border-width: thick
</style>
