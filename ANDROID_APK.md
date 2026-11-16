# XR18 Touch Pro — Application Android APK Autonome

Ce projet intègre un projet Android complet (`android/`) via **Capacitor** avec un plugin natif Java (**`XR18OscPlugin.java`**) utilisant directement les sockets UDP Android (`DatagramSocket`) sur le port **10024**.

Une fois compilée en `.apk`, l'application fonctionne **de façon 100 % autonome sur tablette ou smartphone Android** (aucun PC ni serveur Node.js requis) et communique directement en Wi-Fi / Ethernet avec votre console Behringer XR18 (`192.168.11.1:10024` en mode point d'accès ou IP locale).

## Méthode 1 : Compiler l'APK sur votre ordinateur (Android Studio ou ligne de commande)

1. Téléchargez / exportez le projet depuis AI Studio.
2. Installez les dépendances et synchronisez le bundle web vers Android :
   ```bash
   npm install
   npm run cap:sync
   ```
3. Compilez l'APK :
   - **Via Android Studio** : lancez `npm run android:open` (ou ouvrez le dossier `android/`), puis **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - **En ligne de commande** (nécessite JDK 21 + Android SDK) :
     ```bash
     cd android
     ./gradlew assembleDebug
     ```
   L'APK autonome sera généré dans :
   `android/app/build/outputs/apk/debug/app-debug.apk`

## Méthode 2 : Compiler l'APK automatiquement dans le cloud (GitHub Actions)

Un workflow `.github/workflows/build-android-apk.yml` est déjà configuré :
1. Poussez ce dépôt sur GitHub (`main` ou `master`).
2. Ouvrez l'onglet **Actions** sur GitHub (ou déclenchez **Build Standalone Android APK** manuellement).
3. Téléchargez l'artefact **`XR18-Touch-Pro-Android-APK`** contenant `app-debug.apk`, puis installez-le sur votre tablette/téléphone Android.
