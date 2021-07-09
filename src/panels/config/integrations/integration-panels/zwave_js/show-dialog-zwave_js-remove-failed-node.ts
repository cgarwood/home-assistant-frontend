import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZWaveJSRemoveFailedNodeDialogParams {
  entry_id: string;
  node_id: number;
}

export const loadRemoveFailedNodeDialog = () =>
  import("./dialog-zwave_js-remove-failed-node");

export const showZWaveJSRemoveFailedNodeDialog = (
  element: HTMLElement,
  removeFailedNodeDialogParams: ZWaveJSRemoveFailedNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-remove-failed-node",
    dialogImport: loadRemoveFailedNodeDialog,
    dialogParams: removeFailedNodeDialogParams,
  });
};
