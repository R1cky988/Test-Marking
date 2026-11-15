cmake_minimum_required(VERSION 3.22.1)

project("omr_native")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -ffast-math")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -O3 -ffast-math")

if(NOT DEFINED OpenCV_DIR)
    set(OpenCV_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../opencv/sdk/native/jni")
endif()
find_package(OpenCV REQUIRED)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${OpenCV_INCLUDE_DIRS}
)

add_library(${CMAKE_PROJECT_NAME} SHARED
    native_bridge.cpp
    distortion_analyzer.cpp
    tps_warper.cpp
    layout_calculator.cpp
    marker_detector.cpp
    omr_processor.cpp
)

target_link_libraries(${CMAKE_PROJECT_NAME}
    ${OpenCV_LIBS}
    android
    log
    jnigraphics
)
