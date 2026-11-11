package com.testmarking.app

import android.app.Application
import android.net.ConnectivityManager
import android.net.Network
import com.testmarking.app.di.appModule
import com.testmarking.app.repository.OnlineExamRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

class TestMarkingApp : Application(), KoinComponent {
    private val exams: OnlineExamRepository by inject()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@TestMarkingApp)
            modules(appModule)
        }
        // Online exams worked offline hand in their paper later: send the waiting ones now and whenever the network comes back.
        flushWaitingExams()
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        cm.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) = flushWaitingExams()
        })
    }

    private fun flushWaitingExams() {
        scope.launch {
            try {
                exams.flushWaiting()
            } catch (ignored: Exception) {
                // the next network change or app start tries again; the paper stays on the phone
            }
        }
    }
}
