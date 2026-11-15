pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
plugins {
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "TestMarking"
include(":app")

// OpenCV is not part of this project. Put the OpenCV Android SDK (the folder that holds build.gradle, java/ and native/) in
// "opencv/sdk" next to this file, or point to it with  -PopencvSdkDir=/path/to/OpenCV-android-sdk/sdk
include(":opencv")
project(":opencv").projectDir = file(
    providers.gradleProperty("opencvSdkDir").orElse("opencv/sdk").get()
)
