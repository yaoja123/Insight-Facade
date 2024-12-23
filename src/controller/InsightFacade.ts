import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "./IInsightFacade";
import {JSZipObject} from "jszip";
import {PerformQueryHelper} from "./PerformQueryHelper";
import {ValidateKey} from "./ValidateKey";
import {RoomHelper} from "./RoomHelper";


let fs = require("fs-extra");
let JSZip = require("jszip");
let parse5 = require("parse5");
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export interface RowContainer {
	[key: string]: any;
}
export default class InsightFacade implements IInsightFacade {
	private insightDatasets: Map<string, InsightDataset>;
	private internalStructure: Map<string, Map<string, Map<string, any>>>;
	// private courseMap: Map<string, Map<string, any>> = new Map<string, Map<string, any>>(); // key: uuid, value: sectionMap
	// private sectionMap: Map<string, any> = new Map<string, any>(); // key: query_key; value: value.
	private currIDs: Set<string> = new Set(); // A set containing all added dataset ids so far.
	constructor() {
		let dir = "./data/";
		if (!fs.existsSync(dir)){
			fs.mkdirSync(dir);
		}
		this.insightDatasets = new Map<string, InsightDataset>();
		this.internalStructure = new Map<string, Map<string, Map<string, any>>>();
	}

	// Performs a query on the dataset.
	// It first should parse and validate the input query.
	// Then perform semantic checks on the query and evaluate the query if it is valid.
	public performQuery(query: any): Promise<any[]> {
		// Check query validation for both class and room
		try {
			let insightDatasetsArray = Array.from(this.insightDatasets.values()); // TODO check semantic
			if (!ValidateKey.validation(query, insightDatasetsArray, this.currIDs)) {
				return Promise.reject(new InsightError("Query is wrongly formatted"));
			}
		} catch (e) {
			return Promise.reject(new InsightError("Invalid"));
		}
		if (Object.keys(query).length === 3) {
			return this.performQueryRoom(query);
		}
		let resultArray: any[] = [];
		let idName: string;
		let idArray: any[];
		let firstColumn = query.OPTIONS.COLUMNS[0];
		idName = firstColumn.split("_")[0];
		// try to get designated id set from the data file.
		try {
			let data = fs.readFileSync("./data/" + idName + ".json").toString();
			let fromData = JSON.parse(data);
			idArray = fromData["data"]; // all objects for this id
			resultArray = idArray.filter((obj) => {
				return PerformQueryHelper.handleWhere(query.WHERE, obj);
			});
			if (resultArray.length > 5000) {
				return Promise.reject(new ResultTooLargeError());
			}
			let realReturn = PerformQueryHelper.handleOptions(query.OPTIONS, resultArray);
			return Promise.resolve(realReturn);
		} catch (err) {
			return Promise.reject(new InsightError());
		}
		return Promise.reject("Not implemented.");
	}

	private performQueryRoom(query: any): Promise<any[]> { // Pass in a valid query
		let resultArray: any[] = []; // query result
		let firstColumn = query.OPTIONS.COLUMNS[0];
		let idName: string = firstColumn.split("_")[0];
		let idArray: any[];
		try {
			let data = fs.readFileSync("./data/" + idName + ".json").toString();
			let fromData = JSON.parse(data);
			idArray = fromData["data"]; // all objects for this id
			resultArray = idArray.filter((obj) => {
				return PerformQueryHelper.handleWhere(query.WHERE, obj);
			});
			let hasTransformation: boolean = (Object.keys(query).length === 3);
			let realReturn: any[] = [];
			let input: any[] = resultArray;
			if(hasTransformation){
				realReturn = PerformQueryHelper.handleTransformation(query,input);
				realReturn = PerformQueryHelper.handleOptions(query.OPTIONS, realReturn);

			}else{
				realReturn = PerformQueryHelper.handleOptions(query.OPTIONS, input);
			}
			if(realReturn.length > 5000){
				return 	 Promise.reject(new ResultTooLargeError());
			}
			return Promise.resolve(realReturn);
		} catch (err) {
			return Promise.reject(new InsightError());
		}
		return Promise.reject("Not implemented.");
	}

	// Helper: Check Id valid
	// for git pushing
	private checkID(id: string, kind: InsightDatasetKind): boolean {
		// Invalid id（Including: underscore, whitespace, repeated id, id is null）
		if (id.includes("_") || !id || !id.trim()) {
			return false;
		}
		// Invalid content (Already been covered by interface)
		// Invalid kind
		if (kind !== InsightDatasetKind.Rooms && kind !== InsightDatasetKind.Courses) {
			return false;
		}
		// Repeated ID
		try {
			this.currIDs.add(id);
		} catch (err) {
			return false;
		}
		return true;
	}

	// TODO could be refactor for the build map
	// Helper: To build a internalMap,courseMap and sectionMap for further query
	private buildMap(inputId: string, result: any[], anyArray: any[]) {
		let courseMap: Map<string, Map<string, any>> = new Map<string, Map<string, any>>(); // key: uuid, value: sectionMap
		for (let element of result) {
			let sectionMap: Map<string, any> = new Map<string, any>(); // key: query_key; value: value.
			if ("Section" in element) {
				let year: number = 1900;
				sectionMap.set(inputId + "_title", element.Title); // The department that offers the course, eg: CPSC.
				sectionMap.set(inputId + "_dept", element.Subject); // The department that offers the course, eg: CPSC.
				sectionMap.set(inputId + "_id", element.Course); // The course number, eg: 310.
				sectionMap.set(inputId + "_avg", element.Avg); // The average of the course offering.
				sectionMap.set(inputId + "_instructor", element.Professor); // The instructor teaching the course offering.
				sectionMap.set(inputId + "_pass", element.Pass); // The number of students that passed the course offering.
				sectionMap.set(inputId + "_fail", element.Fail); // The name of the course
				sectionMap.set(inputId + "_audit", element.Audit); // The number of students that audited the course offering.
				sectionMap.set(inputId + "_uuid", String(element.id)); // The unique id of a course offering.
				if (element.Section === "overall") {
					// stub
				} else {
					year = parseInt(element.Year, 10);
				}
				sectionMap.set(inputId + "_year", year); // The number of students that audited the course offering.
				courseMap.set(element.id, sectionMap);
				this.internalStructure.set(inputId, courseMap);
			}
			anyArray.push(sectionMap);
		}
	}

	public MapToArrayHelper(arr: any[],sectionList: any[],id: any){
		for (let section of arr) {
			try {
				let obj;
				obj = JSON.parse(section);
				let result = obj.result;
				this.buildMap(id, result, sectionList);
			} catch (err) {
				// stub
			}
		}
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!this.checkID(id, kind)) {
			return Promise.reject(new InsightError());
		}
		if (kind === InsightDatasetKind.Rooms) {
			return this.addDatasetRoom(id, content, kind);
		}
		return new Promise<string[]>((resolve, reject) => {
			let zip = new JSZip();// cut up for invalid dataset check up // Read an existing zip and merge the data in the current JSZip object at the current folder level
			zip.loadAsync(content, {base64: true}).then((zipFile: typeof JSZip) => {
				let resultArray: any[] = [];
				zipFile.folder("courses").forEach((relativePath: string, file: JSZipObject) => {
					resultArray.push(file.async("string"));
				});
				let sectionList: any[] = [];
				Promise.all(resultArray).then((arr) => {
					this.MapToArrayHelper(arr, sectionList, id);
				}).then(() => {
					if (sectionList.length === 0) {
						return reject(new InsightError("The added data set:" + id + " is invalid"));
					} else {
						let jsonList = [];
						for (let section of sectionList) {
							let obj: { [key: string]: any } = {};
							for (let [key, value] of section) {
								obj[key] = value;
							}
							jsonList.push(obj);
						}
						let toWriteDisk = JSON.stringify({data: jsonList});
						let add: InsightDataset = {id: id, kind: kind, numRows: sectionList.length};
						this.insightDatasets.set(id, add);
						fs.writeFileSync("./data/" + id + ".json", toWriteDisk); // Write to disk
						fs.writeFileSync("./src/Databases_" + id + ".json",toWriteDisk);
						let stringArray = Array.from(this.currIDs);
						return resolve(stringArray);
					}
				}).catch((err) => console.log(err));
			}).catch((err: any) => {
				return new InsightError(err);
			});
		});
	}

	public addDatasetRoom(id: string, content: string, kind: InsightDatasetKind): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			console.log("reached here");
			let zip = new JSZip();
			let htmIndex: any;
			let resultList: any[] = [];
			let cacheZip: typeof JSZip = {};
			let waitingList: any[] = [];
			zip.loadAsync(content, {base64: true}).then((zipFile: typeof JSZip) => {
				cacheZip = zipFile; // to avoid 3 call back;
				return zipFile.folder("rooms").file("index.htm").async("string");
			}).then((htm: any) => {
				htmIndex = parse5.parse(htm); // htmIndex the JSON tree
				htmIndex = htmIndex.childNodes[6].childNodes[3]; // html tag <body> traverse the list to find table
				let tableBody = RoomHelper.findTable(htmIndex); // got the table body
				if (tableBody === undefined) {
					return reject("does not contain table in this html");
				}
				let tableContent = tableBody.childNodes;
				let buildingInfo: any[] = []; // all building rows
				for (let row of tableContent) {
					if (row.nodeName === "tr") {  // row means a cluster of building information;
						buildingInfo.push(row);
					}
				}
				RoomHelper.processBuildingRow(buildingInfo, resultList, cacheZip, id, waitingList);
				Promise.all(waitingList).then(() => {
					if (resultList.length === 0) {
						return reject(new InsightError("no room in this data sets"));
					} else {
						let toWriteDisk = JSON.stringify({data: resultList});
						let add: InsightDataset = {id: id, kind: kind, numRows: resultList.length};
						this.insightDatasets.set(id, add);
						fs.writeFileSync("./data/" + id + ".json", toWriteDisk); // Write to disk
						// fs.writeFileSync("./src/Databases_" + id + ".json",toWriteDisk);
						let stringArray = Array.from(this.currIDs);
						return resolve(stringArray);
					}
				}).catch((err)=>{
					console.log(err);
				});
			});
		});
	}

	public removeDataset(id: string): Promise<string> {
		// Invalid ID
		if (id.includes("_") || !id || !id.trim()) {
			return Promise.reject(new InsightError("Invalid either contain underscore or only whitespace exists"));
		}
		// ID not found (Dataset not yet added)
		if (this.currIDs.has(id)) {
			this.currIDs.delete(id);
			this.insightDatasets.delete(id);
			this.internalStructure.delete(id);
			fs.removeSync("./data/" + id + ".json");
			return Promise.resolve(id);
		} else {
			return Promise.reject(new NotFoundError("Dataset not found"));
		}
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let IdataSetArray: InsightDataset[] = [];
		for (let [key, value] of this.insightDatasets) {
			IdataSetArray.push(value);
		}
		return Promise.resolve(IdataSetArray);
	}

}

