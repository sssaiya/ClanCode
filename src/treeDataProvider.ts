import {
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
} from "vscode";

// import { INCREMENT_COUNT_COMMAND } from "./constants";
// import { ICountStore } from "./store";

class myItem extends TreeItem {
  constructor(
    public readonly label: string,
    private status: string,
    public readonly collapsibleState: TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return `${this.label}-${this.status}`;
  }

  get description(): string {
    return this.status;
  }
}

export class myTreeDataProvider implements TreeDataProvider<myItem> {
  // onDidChangeTreeData?: Event<void | Command | null | undefined> | undefined;
  getTreeItem(element: myItem): TreeItem | Thenable<myItem> {
    return element;
  }
  getChildren(element?: myItem | undefined): ProviderResult<myItem[]> {
    throw new Error("Method not implemented.");
  }
}
