import {
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  EventEmitter,
  Event,
} from "vscode";
import { UserStatus, getThermometer } from "./extension";
import path = require("path");

class myItem extends TreeItem {
  constructor(
    public readonly label: string,
    private status: string,
    public readonly collapsibleState: TreeItemCollapsibleState,
    public readonly score: number,
    public readonly intensityScore: number
  ) {
    super(label, collapsibleState);
  }

  get tooltip(): string {
    return `${this.label}-${this.status}`;
  }

  get description(): string {
    if (this.status == "online") return this.status + ", score - " + this.score;
    return this.status;
  }

  public readonly iconPath = {
    light: path.join(__filename, "..", "..", "images", "test.svg"),
    dark: path.join(__filename, "..", "..", "images", "test.svg"),
  };
}

class mySubItem extends TreeItem {
  constructor(
    public readonly label: string,
    private score: number

  ) {
    super(label);
  }

  get tooltip(): string {
    return `${this.score}`;
  }
}

export class myTreeDataProvider implements TreeDataProvider<TreeItem> {
  constructor(private ClanStatusArray: Map<string, UserStatus>) { }

  getTreeItem(element: myItem): TreeItem | Thenable<myItem> {
    return element;
  }
  getChildren(element?: myItem | undefined): ProviderResult<TreeItem[]> {
    var items: Array<TreeItem> = [];
    if (element == undefined) {
      // User element
      this.ClanStatusArray.forEach((userStatus) => {
        const item = new myItem(
          userStatus.username,
          userStatus.status,
          TreeItemCollapsibleState.Collapsed,
          userStatus.score,
          userStatus.intensityScore
        );
        items.push(item);
      });
    } else {
      const codeScoreStr = getThermometer(element.score);
      const intensityScoreStr = getThermometer(element.intensityScore);
      const subItem = new mySubItem(codeScoreStr, element.score);
      const subItem2 = new mySubItem(intensityScoreStr, element.score);

      // Add actions other stuff here (Shown on click)
      items.push(subItem);
      items.push(subItem2);
    }
    return Promise.resolve(items);
  }

  private _onDidChangeTreeData: EventEmitter<
    myItem | undefined
  > = new EventEmitter<myItem | undefined>();

  readonly onDidChangeTreeData: Event<myItem | undefined> = this
    ._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}
