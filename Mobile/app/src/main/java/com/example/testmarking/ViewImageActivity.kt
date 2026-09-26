package com.example.testmarking

import android.graphics.BitmapFactory
import android.os.Bundle
import android.widget.Button
import android.widget.ImageButton
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import java.io.File

class ViewImageActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_view_image)

        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val ivFullResult = findViewById<ImageView>(R.id.ivFullResult)


        val path = intent.getStringExtra("IMAGE_PATH")

        if (path != null) {
            val imgFile = File(path)
            if (imgFile.exists()) {
                val bitmap = BitmapFactory.decodeFile(imgFile.absolutePath)
                ivFullResult.setImageBitmap(bitmap)
            }
        }
        findViewById<ImageButton>(R.id.btnBackImage).setOnClickListener {
            finish()
        }
    }


}