package com.example.testmarking.models

data class Exam(
    val id : Long = System.currentTimeMillis(),
    var name : String,
    var answers : IntArray
)
