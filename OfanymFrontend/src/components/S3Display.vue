<template>
  <q-card-section >
    <q-btn  @click="saveFile()">
      Download File
    </q-btn>
  </q-card-section>
</template>

<script>
import {
  ref,
  defineComponent,
  onMounted
} from "vue";
import { Buffer } from "buffer";
import { createWriteStream } from 'streamsaver';
import toBuffer from 'typedarray-to-buffer';
import { createDecipheriv } from 'browser-crypto';
import { S3Client, GetObjectTaggingCommand } from "@aws-sdk/client-s3";
import s3Config from '../../config/s3.json';

const uri = 'https://ofanymdev.s3.eu-west-1.amazonaws.com/files/1687444653133-test.jpg';
const fileKey = 'files/1687444653133-test.jpg';
const crypto = window.crypto;
const client = new S3Client({
  region: s3Config.region,
  bucket: s3Config.bucket,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey
  } });


export default defineComponent ({
  name: "S3Display",
  setup() {
    onMounted(async() => {
      window.Buffer = window.Buffer || Buffer;

    });
    let authTagString, ivString, keyString;
    const saveFile = async() => {
      try{
        const input = {
          "Bucket": s3Config.bucket,
          "Key": fileKey
        };
        const command = new GetObjectTaggingCommand(input);
        const response = await client.send(command);
        authTagString = response.TagSet[0].Value;
        ivString = response.TagSet[1].Value;
        keyString = response.TagSet[2].Value;
        await downloadFile(uri, 'testDecrypt.jpg', keyString, ivString, authTagString);
      }
      catch (e) {
        console.log("saveFile error: ", e)
      }
    }



    const downloadFile = (url, fileName, keyString, ivString, authTagString) => {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        Buffer.from(keyString, 'base64'),
        Buffer.from(ivString, 'base64')
      );

      decipher.setAuthTag(Buffer.from(authTagString, 'base64'));

      return fetch(url).then(res => {
        const fileStream = createWriteStream(fileName);
        const contentLength = res.headers['Content-Length'];
        const writer = fileStream.getWriter();
        let totalBytesRead = 0;
        const decrypt =  new TransformStream({
          transform: async (chunk, controller) => {
            try {
              chunk = toBuffer(chunk);
            } catch (err) {
              console.error(err);
            }

            // Decrypt chunk and send it out
            const decryptedChunk = decipher.update(chunk);
            controller.enqueue(decryptedChunk);

            // Emit a progress update
            totalBytesRead += chunk.length;
            emitProgress(totalBytesRead, contentLength, url);
          },
        })

        if (res.body.pipeTo && res.body.pipeThrough) {
          writer.releaseLock();
          return res.body
            .pipeThrough(decrypt)
            .pipeTo(fileStream);
        }

        const reader = res.body.getReader();
        const pump = () =>
          reader
            .read()
            .then(({ value, done }) => (done ? writer.close() : writer.write(value).then(pump)));
        return pump();
      });
    };

    const emitProgress = (totalBytesRead, contentLength, url) => {
      const percent = Math.round((totalBytesRead / contentLength) * 100);
      const event = new CustomEvent(url, {
        detail: {
          percent,
          totalBytesRead,
          contentLength,
        },
      });
      window.dispatchEvent(event);
    }

    return {
      ref,
      saveFile
    }
  }

})
</script>

<style scoped>

</style>
