import http from "http";
import JSZip from "jszip";
import {InsightError} from "./IInsightFacade";
import parse5 from "parse5";
import {RowContainer} from "./InsightFacade";

export class RoomHelper{
	// reference from https://nodejs.org/api/http.html#http_http
	public static getGeoInfo(url: any): Promise<any> {
		return new Promise((resolve, reject) => {
			http.get(url, (res: any) => {
				const {statusCode} = res;
				let error;
				if (statusCode !== 200) {
					error = new Error(
						`Status Code: ${statusCode}`);
				}
				if (error) {
					res.resume();
					reject(error);
				}
				res.setEncoding("utf8");
				let rawData = "";
				res.on("data", (chunk: any) => {
					rawData += chunk;
				});
				res.on("end", () => {
					try {
						const parsedData = JSON.parse(rawData);
						resolve(parsedData);
					} catch (e: any) {
						// resolve(e.message);
					}
				});
			}).on("error", (e: any) => {
				reject(`Got error: ${e.message}`);
			});
		});
	}

	public static findTable(body: any): any {
		for (let element of body.childNodes) {
			if (element.nodeName === "table") {
				return element.childNodes[3];
			} else if (element.childNodes !== undefined) {
				if (this.findTable(element) !== undefined) {
					return this.findTable(element);
				}
			}
		}
	}

	public static ProcessRooms(rowContainer: RowContainer, result: any[]
		,zipFile: typeof JSZip, id: any, tableContent: any[]){
		for (let row of tableContent) { // each row is an independent room
			console.log("entered for loop");
			if (row.nodeName === "tr") {
				console.log("entered if ");

				let roomHerf = row.childNodes[1].childNodes[1].attrs[0].value;  // first row.first td. "a".attr[0].value; herf location
				let roomNumber = row.childNodes[1].childNodes[1].childNodes[0].value;
				let roomSeat = row.childNodes[3].childNodes[0].value.trim();
				roomSeat = Number(roomSeat);
				let roomFurniture = row.childNodes[5].childNodes[0].value.trim();
				let roomType = row.childNodes[7].childNodes[0].value.trim();
				let obj: any = {};
				obj[id + "_fullname"] = rowContainer.fullName;
				obj[id + "_shortname"] = rowContainer.shortName;
				obj[id + "_number"] = roomNumber;
				obj[id + "_name"] = rowContainer.shortName + "_" + roomNumber;
				obj[id + "_address"] = rowContainer.address;
				obj[id + "_lat"] = rowContainer.lat;
				obj[id + "_lon"] = rowContainer.lon;
				if (roomSeat === undefined) {
					obj[id + "_seats"] = 0;
				} else {
					obj[id + "_seats"] = roomSeat;
				}
				obj[id + "_type"] = roomType;
				obj[id + "_furniture"] = roomFurniture;
				obj[id + "_href"] = roomHerf; // Object built;
				console.log(rowContainer.shortName + "    " + roomNumber);
				// console.log(obj);
				result.push(obj);
			}else{
				console.log("this is not a tr");
			}
		}
	}

	public static  processBuildingRow(buildingInfo: any[], result: any[]
		,zipFile: typeof JSZip, id: any, waitingList: any[]) {
		for (let row of buildingInfo) {
			let rowContainer: RowContainer = {};
			let transAddress = encodeURIComponent(row.childNodes[7].childNodes[0].value.trim());
			let rowUrl = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team116/" + transAddress + "\n";
			let rowLon = "";
			let rowLat = "";
			let promise = new Promise((resolve, reject) => {
				this.getGeoInfo(rowUrl).then((Obj: any) => {
					if (Obj.error !== undefined) {
						resolve(new InsightError("no geo for it"));
					} else {
						rowLon = Obj.lon;
						rowLat = Obj.lat;
						rowContainer["herf"] = row.childNodes[9].childNodes[1].attrs[0].value.trim();
						rowContainer["shortName"] = row.childNodes[3].childNodes[0].value.trim();
						rowContainer["fullName"] = row.childNodes[5].childNodes[1].childNodes[0].value.trim();
						rowContainer["address"] = row.childNodes[7].childNodes[0].value.trim();
						rowContainer["lat"] = rowLat;
						rowContainer["lon"] = rowLon;
						let address = "rooms" + row.childNodes[9].childNodes[1].attrs[0].value.trim().substring(1);
						let tableContent: any[] = [];
						let name = zipFile.file(address);
						if(name !== null){
							name.async("string") // got the
								.then((buildingHtm: any) => {
									buildingHtm = parse5.parse(buildingHtm);
									buildingHtm = buildingHtm.childNodes[6].childNodes[3]; // html body element
									let tableBody = this.findTable(buildingHtm);
									if (tableBody === undefined) {
										resolve("no room in this building");
									}else {
										tableContent = tableBody.childNodes;
										this.ProcessRooms(rowContainer, result, zipFile, id, tableContent);
									}
									resolve(console.log(row.childNodes[3].childNodes[0].value.trim() + "resolved"));
								});
						}else {
							resolve("xxxxxxx");
						}
					}
				}).catch((err) => {
					reject( new InsightError(err));
				});
			});
			waitingList.push(promise);
		}
	}
}
