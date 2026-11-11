package com.testmarking.app.di

import com.google.gson.Gson
import com.testmarking.app.BuildConfig
import com.testmarking.app.data.AuthApi
import com.testmarking.app.data.ClassApi
import com.testmarking.app.data.ExamApi
import com.testmarking.app.data.local.AttemptStore
import com.testmarking.app.repository.OnlineExamRepository
import com.testmarking.app.ui.exam.ExamManageViewModel
import com.testmarking.app.ui.exam.TakeExamViewModel
import com.testmarking.app.data.RefreshApi
import com.testmarking.app.data.ServerConfig
import com.testmarking.app.data.SessionStore
import com.testmarking.app.network.AuthInterceptor
import com.testmarking.app.network.ServerOverrideInterceptor
import com.testmarking.app.network.TokenAuthenticator
import com.testmarking.app.repository.AuthRepository
import com.testmarking.app.repository.ClassRepository
import com.testmarking.app.ui.classes.ClassDetailViewModel
import com.testmarking.app.ui.classes.ClassListViewModel
import com.testmarking.app.ui.login.LoginViewModel
import com.testmarking.app.ui.profile.ProfileViewModel
import com.testmarking.app.ui.register.RegisterViewModel
import com.testmarking.app.ui.verify.VerifyEmailViewModel
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.koin.android.ext.koin.androidContext
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.core.qualifier.named
import org.koin.dsl.module
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

private val REFRESH_CLIENT = named("refreshClient")
private val REFRESH_RETROFIT = named("refreshRetrofit")

val appModule = module {
    single { Gson() }
    single { SessionStore(androidContext()) }
    single { ServerConfig(androidContext()) }

    single {
        HttpLoggingInterceptor().apply {
            // BASIC logs method, url and status only (never bodies, so no passwords or tokens)
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
        }
    }

    // A second client, without the authenticator, only for POST user/refresh.
    single(REFRESH_CLIENT) {
        OkHttpClient.Builder()
            .addInterceptor(ServerOverrideInterceptor(get()))
            .addInterceptor(get<HttpLoggingInterceptor>())
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    single(REFRESH_RETROFIT) {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(get(REFRESH_CLIENT))
            .addConverterFactory(GsonConverterFactory.create(get<Gson>()))
            .build()
    }
    single<RefreshApi> { get<Retrofit>(REFRESH_RETROFIT).create(RefreshApi::class.java) }

    single {
        OkHttpClient.Builder()
            .addInterceptor(ServerOverrideInterceptor(get()))
            .addInterceptor(AuthInterceptor(get()))
            .authenticator(TokenAuthenticator(get(), get()))
            .addInterceptor(get<HttpLoggingInterceptor>())
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    single {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(get<OkHttpClient>())
            .addConverterFactory(GsonConverterFactory.create(get<Gson>()))
            .build()
    }
    single<AuthApi> { get<Retrofit>().create(AuthApi::class.java) }
    single<ClassApi> { get<Retrofit>().create(ClassApi::class.java) }
    single<ExamApi> { get<Retrofit>().create(ExamApi::class.java) }
    single { AttemptStore(androidContext()) }

    single { AuthRepository(get(), get()) }
    single { ClassRepository(get()) }
    single { OnlineExamRepository(get(), get(), get(), get()) }

    viewModel { LoginViewModel(get()) }
    viewModel { RegisterViewModel(get()) }
    viewModel { VerifyEmailViewModel(get()) }
    viewModel { (scope: String) -> ClassListViewModel(scope, get()) }
    viewModel { (classId: String) -> ClassDetailViewModel(classId, get()) }
    viewModel { (examId: String) -> TakeExamViewModel(examId, get()) }
    viewModel { (examId: String) -> ExamManageViewModel(examId, get()) }
    viewModel { ProfileViewModel(get()) }
}
