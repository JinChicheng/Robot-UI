package com.robotui.mvp

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import org.json.JSONObject

class MainActivity : Activity() {

    private lateinit var faceWebView: WebView
    private lateinit var stateButtons: Map<String, Button>
    private var pageReady = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        setContentView(R.layout.activity_main)

        faceWebView = findViewById(R.id.faceWebView)

        hideSystemBars()
        setupWebView()
        setupButtons()
    }

    override fun onResume() {
        super.onResume()
        hideSystemBars()
        faceWebView.onResume()
    }

    override fun onPause() {
        faceWebView.onPause()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemBars()
        }
    }

    override fun onDestroy() {
        faceWebView.apply {
            stopLoading()
            destroy()
        }
        super.onDestroy()
    }

    fun setFaceState(state: String) {
        runFaceJs("window.setFaceState(${JSONObject.quote(state)});")
    }

    private fun setupWebView() {
        faceWebView.setBackgroundColor(Color.BLACK)
        faceWebView.overScrollMode = View.OVER_SCROLL_NEVER
        faceWebView.isHorizontalScrollBarEnabled = false
        faceWebView.isVerticalScrollBarEnabled = false

        with(faceWebView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            mediaPlaybackRequiresUserGesture = false
        }

        WebView.setWebContentsDebuggingEnabled(true)

        faceWebView.webChromeClient = WebChromeClient()
        faceWebView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                pageReady = true
                applyStateSelection("calm")
            }
        }

        faceWebView.loadUrl(getString(R.string.face_asset_url))
    }

    private fun setupButtons() {
        stateButtons = linkedMapOf(
            "calm" to findViewById(R.id.buttonCalm),
            "happy" to findViewById(R.id.buttonHappy),
            "speaking" to findViewById(R.id.buttonSpeaking),
            "thinking" to findViewById(R.id.buttonThinking),
            "angry" to findViewById(R.id.buttonAngry),
            "bored" to findViewById(R.id.buttonBored),
            "tired" to findViewById(R.id.buttonTired)
        )

        stateButtons.forEach { (state, button) ->
            button.setOnClickListener {
                applyStateSelection(state)
            }
        }

        updateButtonStyles("calm")
    }

    private fun applyStateSelection(state: String) {
        setFaceState(state)
        updateButtonStyles(state)
    }

    private fun updateButtonStyles(selectedState: String) {
        if (!::stateButtons.isInitialized) {
            return
        }

        val defaultBackground = getColor(R.color.button_surface)
        val defaultText = getColor(R.color.button_text)
        val selectedText = getColor(R.color.button_text_selected)

        stateButtons.forEach { (state, button) ->
            val backgroundColor = if (state == selectedState) {
                getColor(accentColorForState(state))
            } else {
                defaultBackground
            }
            val textColor = if (state == selectedState) selectedText else defaultText

            button.backgroundTintList = ColorStateList.valueOf(backgroundColor)
            button.setTextColor(textColor)
            button.alpha = if (state == selectedState) 1f else 0.9f
        }
    }

    private fun accentColorForState(state: String): Int {
        return when (state) {
            "calm" -> R.color.emotion_calm
            "happy" -> R.color.emotion_happy
            "speaking" -> R.color.emotion_speaking
            "thinking" -> R.color.emotion_thinking
            "angry" -> R.color.emotion_angry
            "bored" -> R.color.emotion_bored
            "tired" -> R.color.emotion_tired
            else -> R.color.button_surface
        }
    }

    private fun runFaceJs(script: String) {
        if (!pageReady) {
            return
        }
        faceWebView.evaluateJavascript(script, null)
    }

    private fun hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.systemBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                    View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        }
    }
}
