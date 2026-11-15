plugins {
    alias(libs.plugins.android.application)
}

// Where the OpenCV Android SDK is (see settings.gradle.kts). The C++ part of the grading reads native/jni/OpenCVConfig.cmake from it.
val opencvSdkDir = providers.gradleProperty("opencvSdkDir")
    .orElse(rootProject.layout.projectDirectory.dir("opencv/sdk").asFile.absolutePath)

// Address of the backend. 10.0.2.2 is the host machine as seen from the Android emulator. For a real phone build with the address
// of the machine that runs the backend, e.g.  ./gradlew assembleDebug -PapiBaseUrl=http://192.168.1.10:8080/api/v1/
// (or put  apiBaseUrl=...  in gradle.properties). The address is no longer typed in the app.
val apiBaseUrl: String? = providers.gradleProperty("apiBaseUrl").orNull
val debugApiBaseUrl = apiBaseUrl ?: "http://192.168.1.10/api/v1/"

val releaseApiBaseUrl = apiBaseUrl ?: "https://example.invalid/api/v1/"

android {
    namespace = "com.testmarking.app"
    compileSdk {
        version = release(36) {
            minorApiLevel = 1
        }
    }

    defaultConfig {
        applicationId = "com.testmarking.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"

        externalNativeBuild {
            cmake {
                cppFlags += "-std=c++17"
                arguments += "-DOpenCV_DIR=${opencvSdkDir.get()}/native/jni"
            }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"$debugApiBaseUrl\"")
        }
        release {
            buildConfigField("String", "API_BASE_URL", "\"$releaseApiBaseUrl\"")
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        viewBinding = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.recyclerview)
    implementation(libs.androidx.swiperefreshlayout)

    implementation(libs.androidx.navigation.fragment.ktx)
    implementation(libs.androidx.navigation.ui.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.fragment.ktx)

    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging.interceptor)
    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.koin.android)

    // Camera + OpenCV for grading a paper sheet
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.androidx.exifinterface)
    implementation(libs.coil)
    implementation(project(":opencv"))

    testImplementation(libs.junit)
}
