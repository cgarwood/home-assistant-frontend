import { fireEvent } from "../../../../common/dom/fire_event";
import { LovelaceConfig } from "../../../../data/lovelace";

export interface SelectViewDialogParams {
  lovelaceConfig: LovelaceConfig;
  allowDashboardChange: boolean;
  urlPath?: string | null;
  header?: string;
  viewSelectedCallback: (
    urlPath: string | null,
    config: LovelaceConfig,
    view: number
  ) => void;
}

export const showSelectViewDialog = (
  element: HTMLElement,
  selectViewDialogParams: SelectViewDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-select-view",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-select-view" */ "./hui-dialog-select-view"
      ),
    dialogParams: selectViewDialogParams,
  });
};
