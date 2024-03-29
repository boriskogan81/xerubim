const openpgp = require('openpgp');

const test = async () => {

  const publicKeyArmored = `-----BEGIN PGP PUBLIC KEY BLOCK-----

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
=uF7e
-----END PGP PUBLIC KEY BLOCK-----
`

  const privateKeyArmored = `-----BEGIN PGP PRIVATE KEY BLOCK-----

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
naUhW039h3LDjKQ=
=aKQp
-----END PGP PRIVATE KEY BLOCK-----
`

  const buyerEncryptedKey = `-----BEGIN PGP MESSAGE-----

wcFMA1ZCd0V/VwMnAQ//S5pdHEpMMB0OSTXu/m5Zth27AsTQpuJX03XCklLr
ahOwzgkTAGvhup/zX1sWcE+m/Ai+uKLj8h3TTpFpVzIHntOWtcysNcpMtykR
EpVVFH0fkQKAqXMmZkk+F6kZCTGVuGaqE7j99lyl+dINYHPz1DLo2Rf7KA9+
1VDvlN8ED4uBqnu+Ocya4tfwmljm+N80dJ9v6LJeIVdvKHziJMqU7lM4UfO+
YCZqnVmnZPoK/8sAhLsV65zrY+ruHuAcgIXFuQQL0+RGJm1zgOClwAv9LQ2b
gVZZYsKV6zcnIDP6i+LPGYOFh1NPG5uLKq23fgfDlOu1s2AxPnFIvDCeIPhE
LSZx2RFbAA5g8pbjHqSMUFiWfUZtMhdpfP8vcXLKFcxMjOWhdfg7UsJdmI41
JMDU4O0d6TV3hLQIfQlydwOaAv0wBkeXZxSNe5BSxyOYspwljEqnnoyHrFOd
GrV1B66AOjepTEqYl0UPrPKUdBh7dC5KlS1OtUPvwrF/qpPXcJlE4ndACz8W
yRfdLJFlN9yjX9Sb2F0sBU5YoXA4/BHQ8NZMoYmE+MZFhGAyPZ++HvDpTFbT
Ju4WXdR1IJXQuWNCBX5ltfUb3hH8h7+xgs8GXV4ly4Pdr78KNMGS4T+Xa6Jz
BC/XpmlNW6tWZJE6BQfjY5FNBrc+weOvOgDRfVC5QHDSOgETvFgwgExxVa50
XnjjLm77hf0VaXA3IwbGn4PiuZQam9ekHm6DF6dGPwJS6IE9MfcUxdkV6+d2
8Go=
=DlO9
-----END PGP MESSAGE-----
`

  const passphrase = 'passphrase'

  const buyerPublicKey = await openpgp.readKey({armoredKey: publicKeyArmored});

  const buyerPrivateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({armoredKey: privateKeyArmored}),
    passphrase
  });

  const message = await openpgp.readMessage({
    armoredMessage: buyerEncryptedKey
  })

  const {data: decrypted} = await openpgp.decrypt({
    message,
    verificationKeys: buyerPublicKey,
    decryptionKeys: buyerPrivateKey
  });
  console.log('decrypted: ', decrypted)

}

test()
