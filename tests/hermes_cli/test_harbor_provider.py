"""Harbor Engine provider integration tests."""

import json
from unittest.mock import patch

from hermes_cli import runtime_provider as rp
from hermes_cli.auth import (
    PROVIDER_REGISTRY,
    get_api_key_provider_status,
    resolve_api_key_provider_credentials,
    resolve_provider,
)


def _write_hw_credentials(path, token="hw-test-token-123456"):
    path.write_text(
        json.dumps(
            {
                "api_base_url": "https://platform.harborworks.ai",
                "token": token,
                "user_id": "user_test",
            }
        )
    )


def test_harbor_provider_registered():
    provider = PROVIDER_REGISTRY["harbor"]

    assert provider.name == "Harbor Engine"
    assert provider.auth_type == "api_key"
    assert provider.inference_base_url == "https://engine.harborworks.ai/anthropic"
    assert provider.api_key_env_vars == ("HARBOR_ENGINE_TOKEN",)
    assert provider.base_url_env_var == "HARBOR_ENGINE_BASE_URL"


def test_harbor_credentials_read_hw_default_credentials(monkeypatch, tmp_path):
    credentials_path = tmp_path / "credentials.json"
    _write_hw_credentials(credentials_path)
    monkeypatch.setenv("HARBOR_HW_CREDENTIALS", str(credentials_path))
    monkeypatch.delenv("HARBOR_ENGINE_TOKEN", raising=False)
    monkeypatch.delenv("HARBOR_ENGINE_BASE_URL", raising=False)

    creds = resolve_api_key_provider_credentials("harbor")

    assert creds["api_key"] == "hw-test-token-123456"
    assert creds["base_url"] == "https://engine.harborworks.ai/anthropic"
    assert creds["source"] == str(credentials_path)


def test_harbor_env_token_overrides_hw_file(monkeypatch, tmp_path):
    credentials_path = tmp_path / "credentials.json"
    _write_hw_credentials(credentials_path, token="hw-file-token")
    monkeypatch.setenv("HARBOR_HW_CREDENTIALS", str(credentials_path))
    monkeypatch.setenv("HARBOR_ENGINE_TOKEN", "env-token-123456")

    creds = resolve_api_key_provider_credentials("harbor")

    assert creds["api_key"] == "env-token-123456"
    assert creds["source"] == "HARBOR_ENGINE_TOKEN"


def test_harbor_base_url_override_normalizes_to_anthropic(monkeypatch, tmp_path):
    credentials_path = tmp_path / "credentials.json"
    _write_hw_credentials(credentials_path)
    monkeypatch.setenv("HARBOR_HW_CREDENTIALS", str(credentials_path))
    monkeypatch.setenv("HARBOR_ENGINE_BASE_URL", "https://stage-engine.harborworks.ai")

    creds = resolve_api_key_provider_credentials("harbor")

    assert creds["base_url"] == "https://stage-engine.harborworks.ai/anthropic"


def test_harbor_status_uses_hw_credentials(monkeypatch, tmp_path):
    credentials_path = tmp_path / "credentials.json"
    _write_hw_credentials(credentials_path)
    monkeypatch.setenv("HARBOR_HW_CREDENTIALS", str(credentials_path))
    monkeypatch.delenv("HARBOR_ENGINE_TOKEN", raising=False)

    status = get_api_key_provider_status("harbor")

    assert status["configured"]
    assert status["key_source"] == str(credentials_path)
    assert status["base_url"] == "https://engine.harborworks.ai/anthropic"


def test_harbor_model_catalog_is_limited_to_supported_chat_models():
    from hermes_cli.models import (
        CANONICAL_PROVIDERS,
        get_default_model_for_provider,
        provider_model_ids,
        visible_canonical_providers,
    )

    assert provider_model_ids("harbor") == [
        "claude-sonnet-4.6",
        "claude-opus-4.7",
    ]
    assert get_default_model_for_provider("harbor") == "claude-sonnet-4.6"
    assert any(provider.slug == "harbor" for provider in CANONICAL_PROVIDERS)
    assert [provider.slug for provider in visible_canonical_providers()] == ["harbor"]


def test_harbor_provider_surfaces_hide_other_providers(monkeypatch):
    from hermes_cli.inventory import ConfigContext, build_models_payload
    from hermes_cli.main import _build_provider_choices

    monkeypatch.delenv("HARBOR_SHOW_ALL_PROVIDERS", raising=False)

    assert _build_provider_choices() == ["auto", "harbor"]
    from hermes_cli.models import list_available_providers

    assert [provider["id"] for provider in list_available_providers()] == ["harbor"]

    rows = [
        {"slug": "harbor", "name": "Harbor Engine", "models": ["claude-sonnet-4.6"], "total_models": 1},
        {"slug": "openrouter", "name": "OpenRouter", "models": ["m"], "total_models": 1},
        {"slug": "custom:Ollama", "name": "Ollama", "models": ["m"], "total_models": 1},
    ]
    ctx = ConfigContext(
        current_provider="harbor",
        current_model="claude-sonnet-4.6",
        current_base_url="",
        user_providers={},
        custom_providers=[],
    )
    with patch("hermes_cli.model_switch.list_authenticated_providers", return_value=rows):
        payload = build_models_payload(ctx, include_unconfigured=True, picker_hints=True, canonical_order=True)

    assert [row["slug"] for row in payload["providers"]] == ["harbor"]


def test_resolve_runtime_provider_harbor(monkeypatch, tmp_path):
    credentials_path = tmp_path / "credentials.json"
    _write_hw_credentials(credentials_path)
    monkeypatch.setenv("HARBOR_HW_CREDENTIALS", str(credentials_path))
    monkeypatch.delenv("HARBOR_ENGINE_TOKEN", raising=False)
    monkeypatch.setattr(
        rp,
        "load_pool",
        lambda provider: type("Pool", (), {"has_credentials": lambda self: False})(),
    )
    monkeypatch.setattr(rp, "_get_model_config", lambda: {"provider": "harbor", "default": "claude-sonnet-4.6"})

    resolved = rp.resolve_runtime_provider(requested="harbor")

    assert resolved["provider"] == "harbor"
    assert resolved["api_mode"] == "anthropic_messages"
    assert resolved["base_url"] == "https://engine.harborworks.ai/anthropic"
    assert resolved["api_key"] == "hw-test-token-123456"
    assert resolved["source"] == str(credentials_path)


def test_resolve_provider_harbor_aliases(monkeypatch, tmp_path):
    credentials_path = tmp_path / "credentials.json"
    _write_hw_credentials(credentials_path)
    monkeypatch.setenv("HARBOR_HW_CREDENTIALS", str(credentials_path))

    assert resolve_provider("harbor") == "harbor"
    assert resolve_provider("harbor-engine") == "harbor"
    assert resolve_provider("harborworks") == "harbor"
