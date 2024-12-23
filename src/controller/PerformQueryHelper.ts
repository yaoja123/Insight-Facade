import Decimal from "decimal.js";
import {PerformQueryUtil} from "./PerformQueryUtil";

export class PerformQueryHelper {
	public static handleTransformation(query: any, resultArray: any[]): any {
		let trans = query.TRANSFORMATIONS;
		let group = trans.GROUP;
		let apply = trans.APPLY;
		let inputGroup = group;
		let groupResult: any[] = [];
		groupResult = this.helpGroup(inputGroup, resultArray)!;
		let applyContentArr: any[] = [];
		let returnArr: any[] = this.helpApply(apply, groupResult, applyContentArr)!; // TODO: TS array PASS by reference or pass by value?
		applyContentArr = applyContentArr.concat(group);
		let finalReturn: any[] = [];
		for (let performObj of returnArr) {
			let obj: { [key: string]: any } = {};
			for (let columns of applyContentArr) {
				obj[columns] = performObj[columns];
			}
			finalReturn.push(obj);
		}
		return finalReturn;
	}

	// Helper: handle Where
	public static handleWhere(where: any, every: any): boolean {
		let comparator = Object.keys(where)[0];
		if (Object.keys(where).length === 0) {
			return true; // Do nothing when where is empty (filter nothing)
		}
		switch (comparator) {
			case "AND": {
				return this.logicComparator(where, every);
				break;
			}
			case "OR": {
				return this.logicComparator(where, every);
				break;
			}
			case "LT": {
				return this.MComparator(where, every);
				break;
			}
			case "GT": {
				return this.MComparator(where, every);
				break;
			}
			case "EQ": {
				return this.MComparator(where, every);
				break;
			}
			case "IS": {
				return this.SComparator(where, every);
				break;
			}
			case "NOT": {
				return this.NotComparator(where, every);
				break;
			}
		}
		return false;
	}

	public static handleOptions(opts: any, resultArray: any[]): any {
		let reformattedArray: any[] = [];
		for (let performObj of resultArray) {
			let obj: { [key: string]: any } = {};
			for (let columns of opts.COLUMNS) {
				obj[columns] = performObj[columns];
			}
			reformattedArray.push(obj);
		}
		if ("ORDER" in opts && opts.ORDER.dir === undefined) {
			let order = opts.ORDER;
			reformattedArray.sort((ele1, ele2) => {
				if (typeof ele1[order] === "string" && typeof ele2[order] === "string") {
					if (ele1[order] < ele2[order]) {
						return 1;
					}
					if ( ele1[order] > ele2[order]) {
						return -1;
					}
					return 0;
				} else if (typeof ele1[order] === "number" && typeof ele2[order] === "number") {
					return ele1[order] - ele2[order];
				}else{
					return 0;
				}
			});
		} else if ("ORDER" in opts) {
			let order = opts.ORDER;
			let dir = order.dir;
			let keys = order.keys; // e.g. [course_avg, course_foo]
			if(dir === "UP"){
				PerformQueryUtil.sortByUP(reformattedArray,keys);
			}else if(dir === "DOWN"){
				PerformQueryUtil.sortByDOWN(reformattedArray,keys);
			}
		}
		return reformattedArray;
	}

// Helper: applyComparatorSuk// Call query.where
	private static logicComparator(where: any, result: any) {
		if (Object.keys(where)[0] === "OR") {
			for (let obj of where.OR) {
				if (this.handleWhere(obj, result)) { // check logic type of children
					return true;
				}
			}
			return false; // if none of previous hit return false;
		}
		if (Object.keys(where)[0] === "AND") {
			for (let obj of where.AND) {
				if (this.handleWhere(obj, result) === false) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	public static helpApply(applyArr: any[], result: any[], applyContentArr: any[]) { // assume pass in is the apply array apply-> apply rule -> apply Rule{apply key: {apply token : key}}
		for (let applyRule of applyArr) {
			let applyKey = Object.keys(applyRule)[0]; // "maxSeats"
			let applyContent: any = Object.values(applyRule)[0]; // {"MAX": " roomSeats"}
			let applyToken = Object.keys(applyContent)[0]; // MAZ
			let theKey: any = Object.values(applyContent)[0]; // roomseat
			result.forEach((arr) => {
				arr.forEach((obj: any) => {
					obj[applyKey] = obj[theKey];
					delete obj[theKey];
				});
			});
			applyContentArr.push(applyKey);
			if (applyToken === "MAX") { // find max number of each
				let resultArr: any[] = [];
				for (let group of result) {
					let max = group.reduce((prev: any, current: any) =>
						(prev[applyKey] > current[applyKey]) ? prev : current);
					resultArr.push(max);
				}
				return resultArr;
			} else if (applyToken === "MIN") {
				let resultArr: any[] = [];
				for (let group of result) {
					let min = group.reduce((prev: any, current: any) =>
						(prev[applyKey] < current[applyKey]) ? prev : current);
					resultArr.push(min);
				}
				return resultArr;
			} else if (applyToken === "AVG") {
				let resultArr: any[] = [];
				this.avgHelper(result, applyKey, resultArr);
				return resultArr;
			} else if (applyToken === "SUM") {
				return this.sumHelper(result,applyKey);
			} else if (applyToken === "COUNT") {
				let resultArr: any[] = [];
				for (let group of result) {
					let idSet = new Set();
					for (let element of group) {
						idSet.add(element[applyKey]);
					}
					group[0][applyKey] = Number(idSet.size);
					resultArr.push(group[0]);
				}
				return resultArr;
			}
		}
	}

	public static sumHelper(result: any[],applyKey: any){
		let resultArr: any[] = [];
		for (let group of result) {
			let sum = 0;
			for (let element of group) {
				sum += element[applyKey];
			}
			group[0][applyKey] = Number(sum.toFixed(2));
			resultArr.push(group[0]);
		}
		return resultArr;
	}

	public static avgHelper(result: any[], theKey: any, resultArr: any[]) {
		for (let group of result) {
			let summingAvg: any[] = [];
			let total = new Decimal(0);
			for (let avgs of group) {
				let number = new Decimal(avgs[theKey]);
				summingAvg.push(number);
				total = Decimal.add(total, number);
			}
			let numRow = summingAvg.length;
			let avg = total.toNumber() / numRow;
			let res = Number(avg.toFixed(2));
			for (let element of group) {
				element[theKey] = res;
			}
			resultArr.push(group[0]);
		}
	}

	public static helpGroup(transformation: any, resultArray: any[]) {
		let keys = transformation; // TODO keys = group * which is as array
		let firstKeyGroup: any[] = [];
		let keySet: any[] = [];
		let indexKey = keys[0]; // roomshortname
		let result: any[] = [];
		for (let element of resultArray) { // {roomshortname:swng , room full name...}
			if (!keySet.includes(element[indexKey])) { // if keyset has new key content push in key set
				keySet.push(element[indexKey]); // e.g. SWNG
			}
		} // got all the independent groups of this key
		for (let groupKey of keySet) { // {swng, dmp, ...}
			let group: any[] = [];
			group = resultArray.filter((obj: any) => {
				return obj[indexKey] === groupKey; // { roomshortname} === swng
			});
			result.push(group);
			firstKeyGroup.push(groupKey);
		}
		if (keys.length === 1) {
			return result;
		} else if (keys.length > 1) {
			let placeHolder: any[] = [];
			keySet = []; // clear keyset of first group;
			keys = transformation.filter((element: any, i: any) => {
				return 0 !== i;
			});
			for (let key of keys) { // TODO fix parentGroup = result shoule be right
				for (let group of result) {
					for (let element of group) {
						if (!keySet.includes(element[key])) { // if keyset has new key content push in key set
							keySet.push(element[key]); // e.g. SWNG
						}
					}
				}
				for (let groupKey of keySet) {
					for (let group of result) {
						group = group.filter((obj: any) => obj[key] === groupKey); // { roomshortname} === swng); TODO
						if (group !== undefined && group.length !== 0) {
							placeHolder.push(group);
						}
					}
				}
				result = placeHolder;
				placeHolder = [];
				keySet = [];
			}
		}
		return result;
	}

	private static MComparator(query: any, result: any): any {
		let mComparator = Object.keys(query)[0];
		let mapVal: any = Object.values(query)[0];
		let comparator = Object.keys(mapVal)[0];
		let val: any = Object.values(mapVal)[0];
		if ("LT" === mComparator) {
			return result[comparator] < val;
		} else if ("GT" === mComparator) {
			return result[comparator] > val;
		} else if ("EQ" === mComparator) {
			return result[comparator] === val;
		} else {
			return false;
		}
	}

	private static SComparator(where: any, result: any): boolean{
		// Assume the content has been validate and nothing like input*string will happen;
		let content = where.IS;
		let skey = Object.keys(content)[0];
		let inputString: any = Object.values(content)[0];
		let subInputBoth: any = inputString.substring(1, inputString.length - 1);
		let subInputFront: any = inputString.substring(1, inputString.lenghth);
		let subInputBack: any = inputString.substring(0,inputString.length - 1);
		if (!inputString.includes("*")) {
			return result[skey] === inputString;
		} else if (inputString.charAt(0) === "*" && inputString.charAt(inputString.length - 1) === "*"
			&& !subInputBoth.includes("*")) {
			return result[skey].includes(subInputBoth);
		} else if (inputString.charAt(0) === "*" && !subInputFront.includes("*")) {
			return result[skey].endsWith(subInputFront);
		} else if (inputString.charAt(inputString.length - 1) === "*" && !subInputBack.includes("*")) {
			return result[skey].startsWith(subInputBack);
		}else {
			return false;
		}
	}


	private static NotComparator(where: any, result: any): boolean {
		return !this.handleWhere(where.NOT, result);
	}
}
