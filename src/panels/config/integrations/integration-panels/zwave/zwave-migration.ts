import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-button/mwc-button";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-circular-progress";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../../../../components/buttons/ha-call-api-button";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon";
import {
  fetchNetworkStatus,
  ZWaveNetworkStatus,
  ZWAVE_NETWORK_STATE_STOPPED,
  fetchMigrationConfig,
  ZWaveMigrationConfig,
} from "../../../../../data/zwave";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import "../../../../../layouts/hass-tabs-subpage";

@customElement("zwave-migration")
export class ZwaveMigration extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @internalProperty() private _networkStatus?: ZWaveNetworkStatus;

  @internalProperty() private _unsubs: Promise<UnsubscribeFunc>[] = [];

  @internalProperty() private _step = 0;

  @internalProperty() private _stoppingNetwork = false;

  @internalProperty() private _migrationConfig?: ZWaveMigrationConfig;

  public disconnectedCallback(): void {
    this._unsubscribe();
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);
    this._getMigrationConfig();
    this._subscribe();
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${[]}
        back-path="/config/integrations"
      >
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.zwave.migration.header")}
          </div>

          <div slot="introduction">
            ${this.hass.localize(
              "ui.panel.config.zwave.migration.introduction"
            )}
          </div>

          ${this._step === 0
            ? html`
                <ha-card class="content" header="Introduction">
                  <div class="card-content">
                    <p>
                      This wizard will walk through the following steps to
                      migrate from the legacy Z-Wave component to OpenZWave.
                    </p>
                    <ol>
                      <li>Stop the Z-Wave network</li>
                      <li>Configure and start ozwdaemon</li>
                      <li>Set up the OpenZWave integration</li>
                      <li>
                        Migrate entities and devices to the new integration
                      </li>
                      <li>Remove legacy Z-Wave integration</li>
                    </ol>
                    <p>
                      <b>
                        Please take a backup or a snapshot of your environment
                        before proceeding.
                      </b>
                    </p>
                  </div>
                  <div class="card-actions">
                    <mwc-button @click=${this._continue}>
                      Continue
                    </mwc-button>
                  </div>
                </ha-card>
              `
            : ``}
          ${this._step === 1
            ? html`
                <ha-card class="content" header="Stop Z-Wave Network">
                  <div class="card-content">
                    <p>
                      We need to stop the Z-Wave network to perform the
                      migration. Home Assistant will not be able to control
                      Z-Wave devices while the network is stopped.
                    </p>
                    ${this._stoppingNetwork
                      ? html`
                          <div class="flex-container">
                            <ha-circular-progress active></ha-circular-progress>
                            <div><p>Stopping Z-Wave Network...</p></div>
                          </div>
                        `
                      : ``}
                  </div>
                  <div class="card-actions">
                    <mwc-button @click=${this._stopNetwork}>
                      Stop Network
                    </mwc-button>
                  </div>
                </ha-card>
              `
            : ``}
          ${this._step === 2
            ? html`
                <ha-card class="content" header="Set up ozwdaemon">
                  <div class="card-content">
                    <p>
                      Now it's time to set up ozwdaemon, which handles
                      communication between Home Assistant and OpenZWave.
                    </p>
                    ${!this.hass.config.components.includes("hassio")
                      ? html`
                          <p>
                            Install the OpenZWave addon from the
                            <a
                              href="/hassio/addon/core_zwave/info"
                              target="_blank"
                              >addon store</a
                            >. You will need to provide the following
                            configuration:
                          </p>
                          ${this._migrationConfig
                            ? html`
                    <p><blockquote>
                    device: ${this._migrationConfig.usb_path}<br>
                    network_key: ${this._migrationConfig.network_key}
                    </blockquote></p>
                    <p>
                            Once the addon is installed and running, click
                            Continue to set up the OpenZWave integration and
                            migrate your devices and entities.
                          </p>`
                            : ``}
                        `
                      : html`
                          <p>
                            If you're using Home Assistant Core in Docker or a
                            Python venv, see the
                            <a
                              href="https://github.com/OpenZWave/qt-openzwave/blob/master/README.md"
                              target="_blank"
                            >
                              ozwdaemon readme
                            </a>
                            for setup instructions.
                          </p>
                          <p>
                            Here's the current Z-Wave configuration. You'll need
                            these values when setting up ozwdaemon.
                          </p>
                          ${this._migrationConfig
                            ? html`
                    <p><blockquote>
                    USB Path: ${this._migrationConfig.usb_path}<br>
                    Network Key: ${this._migrationConfig.network_key}
                    </blockquote></p>`
                            : ``}
                          <p>
                            Once ozwdaemon is installed and running, click
                            Continue to set up the OpenZWave integration and
                            migrate your devices and entities.
                          </p>
                        `}
                  </div>
                  <div class="card-actions">
                    <mwc-button @click=${this._stopNetwork}>
                      Continue
                    </mwc-button>
                  </div>
                </ha-card>
              `
            : ``}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private async _getMigrationConfig(): Promise<void> {
    this._migrationConfig = await fetchMigrationConfig(this.hass!);
  }

  private _unsubscribe(): void {
    while (this._unsubs.length) {
      this._unsubs.pop()!.then((unsub) => unsub());
    }
  }

  private _continue(e): void {
    this._step++;
  }

  private _stopNetwork(): void {
    this._getNetworkStatus();
    if (this._networkStatus?.state === ZWAVE_NETWORK_STATE_STOPPED) {
      this._step = 2;
    } else {
      this._unsubs = ["zwave.network_stop"].map((e) =>
        this.hass!.connection.subscribeEvents(() => this._networkStopped(), e)
      );
      this._stoppingNetwork = true;
      this.hass!.callService("zwave", "stop_network");
    }
  }

  private _networkStopped(): void {
    this._unsubscribe();
    this._step = 2;
  }

  private async _getNetworkStatus(): Promise<void> {
    this._networkStatus = await fetchNetworkStatus(this.hass!);
  }

  private _subscribe(): void {
    this._unsubs = ["zwave.network_stop"].map((e) =>
      this.hass!.connection.subscribeEvents(
        (event) => this._handleEvent(event),
        e
      )
    );
  }

  private _handleEvent(event) {
    if (event.event_type === "zwave.network_start") {
      // Optimistically set the state, wait 1s and poll the backend
      // The backend will still report a state of 0 when the 'network_start'
      // event is first fired.
      if (this._networkStatus) {
        this._networkStatus = { ...this._networkStatus, state: 5 };
      }
      setTimeout(() => this._getNetworkStatus, 1000);
    } else {
      this._getNetworkStatus();
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        .content {
          margin-top: 24px;
        }

        .flex-container {
          display: flex;
          align-items: center;
        }

        .flex-container ha-circular-progress {
          margin-right: 20px;
        }

        blockquote {
          display: block;
          background-color: #ddd;
          padding: 8px;
          margin: 8px 0;
          font-size: 0.9em;
          font-family: monospace;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--error-color);
        }

        .toggle-help-icon {
          position: absolute;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }

        ha-service-description {
          display: block;
          color: grey;
          padding: 0 8px 12px;
        }

        [hidden] {
          display: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-migration": ZwaveMigration;
  }
}
