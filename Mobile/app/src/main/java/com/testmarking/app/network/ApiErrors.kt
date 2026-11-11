package com.testmarking.app.network

import com.google.gson.JsonParseException
import com.testmarking.app.data.ApiEnvelope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

/** An error already worded for the user. */
class ApiException(message: String, val httpStatus: Int = 0) : Exception(message)

const val MSG_NETWORK = "Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ máy chủ."
const val MSG_UNKNOWN = "Có lỗi xảy ra, vui lòng thử lại."
const val MSG_BAD_RESPONSE = "Phản hồi từ máy chủ không hợp lệ."

/** Runs a network call off the main thread and turns every failure into an [ApiException]. */
suspend fun <T> apiCall(block: suspend () -> T): Result<T> = try {
    Result.success(withContext(Dispatchers.IO) { block() })
} catch (e: CancellationException) {
    throw e
} catch (e: Throwable) {
    Result.failure(toApiException(e))
}

fun toApiException(t: Throwable): ApiException = when (t) {
    is ApiException -> t
    is HttpException -> fromHttp(t)
    is IOException -> ApiException(MSG_NETWORK)
    is JsonParseException -> ApiException(MSG_BAD_RESPONSE)
    else -> ApiException(t.message?.takeIf { it.isNotBlank() } ?: MSG_UNKNOWN)
}

/**
 * Two error shapes exist on the server:
 *  { status: 0, message: "..." }                      (login, register, ...)
 *  { error: { code, message, details } }              (classes, exams, ...)
 */
private fun fromHttp(e: HttpException): ApiException {
    val code = e.code()
    val body = try {
        e.response()?.errorBody()?.string()
    } catch (ignored: Exception) {
        null
    }
    var message: String? = null
    if (!body.isNullOrBlank()) {
        try {
            val json = JSONObject(body)
            message = json.optString("message").takeIf { it.isNotBlank() }
                ?: json.optJSONObject("error")?.optString("message")?.takeIf { it.isNotBlank() }
        } catch (ignored: Exception) {
            // not json: fall through to the generic text
        }
    }
    val text = message ?: when {
        code == 401 -> "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
        code == 403 -> "Bạn không có quyền thực hiện thao tác này."
        code == 404 -> "Không tìm thấy dữ liệu."
        code >= 500 -> "Máy chủ đang gặp sự cố, vui lòng thử lại sau."
        else -> MSG_UNKNOWN
    }
    return ApiException(text, code)
}

fun <T> ApiEnvelope<T>.requireData(): T {
    if (status == 0) throw ApiException(message ?: MSG_UNKNOWN)
    return data ?: throw ApiException(message ?: MSG_BAD_RESPONSE)
}

fun ApiEnvelope<*>.ensureOk() {
    if (status == 0) throw ApiException(message ?: MSG_UNKNOWN)
}
