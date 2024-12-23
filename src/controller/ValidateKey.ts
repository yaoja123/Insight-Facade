import {InsightDataset} from "./IInsightFacade";

export class ValidateKey {
	public static currIDs: Set<string> = new Set();
	public static columns: Set<string> = new Set();
	public static allApplyKeys: Set<string> = new Set();

	private static checkKeyValidation(key: any, insightDatasets: InsightDataset[]): boolean {
		// console.log("start of key validation" + typeof (key));
		if (typeof (key) !== "string") {
			return false;
		}
		// console.log("14");
		let id = key.split("_")[0];
		let field = key.split("_")[1];
		let OKFieldCourses = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
		let OKFieldRooms = ["lat", "lon", "seats", "fullname", "shortname", "number",
			"name", "address", "type", "furniture", "href"];
		for (let eachDataset of insightDatasets) {
			// console.log("20");
			if (id === eachDataset.id && (OKFieldCourses.includes(field) || OKFieldRooms.includes(field))) {
				if (this.currIDs.size === 0) {
					this.currIDs.add(id);
					return true;
				} else {
					// console.log("27");
					return this.currIDs.has(id);
				}
			}
		}
		return false;
	}

	// Check OPTION Start -----------------------
	private static checkOption(options: any, insightDatasets: InsightDataset[]): boolean {

		if (Object.keys(options)[0] === "COLUMNS") {
			if (Object.keys(options).length === 1) {
				return this.checkColumnsValidation(options, insightDatasets);
			}
			if (Object.keys(options).length === 2 && Object.keys(options)[1] === "ORDER") {
				return (this.checkColumnsValidation(options, insightDatasets)
					&& this.checkOptionsOrder(options, insightDatasets));
			}
		}
		return false;
	}

	private static checkColumnsValidation(columns: any, insightDatasets: InsightDataset[]): boolean {
		columns = columns.COLUMNS; // TODO check with suki
		if ( Object.keys(columns).length === 0) {
			return false;
		}
		for (let key of columns) { // check with suki what should be in columns and what should be key?
			if (!(this.checkKeyValidation(key, insightDatasets))) {
				return false;
			}
		}
		return true;
	}

	private static checkOptionsOrder(options: any, insightDatasets: InsightDataset[]): boolean {
		let columns = options.COLUMNS; // ?
		let order = options.ORDER; // ?
		let orderKeys = Object.keys(order);
		if (typeof order === "string") {
			return (columns.includes(order) && this.checkKeyValidation(order, insightDatasets));
		}
		if (Object.keys(order).length !== 2
			|| orderKeys[0] === "dir" || orderKeys[1] === "keys") {
			return false;
		}
		let dir = order.dir;
		let keys = order.keys;
		if (typeof dir !== "string" || !Array.isArray(keys) || keys.length === 0) {
			return false;
		}
		if (dir === "UP" || dir === "DOWN") {
			for (let key of keys) {
				if (!columns.includes(key) || this.checkKeyValidation(key, insightDatasets)) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	// Check OPTION End ------------------------
	// Check WHERE Start -----------------------
	private static checkWhereBlock(where: any, insightDatasets: InsightDataset[]): boolean {
		// console.log("REACH here 5");
		// console.log(where);
		if (Object.keys(where).length === 0) {
			return true;
		}
		if (Array.isArray(where)) {
			return false;
		}
		if (Object.keys(where).length === 1) {
			// console.log("REACH here 6");
			return this.checkComparator(where, insightDatasets);
		}
		return false;
	}

	private static checkComparator(where: any, insightDatasets: InsightDataset[]): boolean {
		// console.log(where);
		// console.log("REACH here 7");
		let mComparator = ["LT", "GT", "EQ"];
		let comparator = Object.keys(where)[0];
		let inside: any = Object.values(where)[0];
		// console.log("Comparator" + comparator);

		let next: any = Object.values(inside)[0];
		if ((comparator === "AND") || (comparator === "OR")) {
			if (where[comparator].length === 0) {
				return false;
			}
			// console.log("where.comparator: " + where.comparator);
			for (let insideComparator of where[comparator]) {
				// console.log("$$$$$$$$" + insideComparator);
				// console.log(insideComparator);
				// console.log("%%%%%%%%" + insideComparator);
				if (!this.checkWhereBlock(insideComparator, insightDatasets)) {
					return false;
				}
			}
			return true; // for git hub
		}
		if (mComparator.includes(comparator)) {
			if (Object.keys(inside).length === 1) {
				if (this.checkKeyValidation(Object.keys(inside)[0], insightDatasets)) {
					if (typeof Object.values(inside)[0] === "number") {
						return true;
					}
				}
			}
		}
		if (comparator === "IS") {
			if (Object.keys(inside).length === 1) {
				if (this.checkKeyValidation(Object.keys(inside)[0], insightDatasets)) {
					if (typeof Object.values(inside)[0] === "string") {
						if (this.checkInputStringValidation(next)) {
							return true;
						}
					}
				}
			}
		}
		if (comparator === "NOT") {
			return this.checkWhereBlock(where.NOT, insightDatasets);
		}
		return false;
	}

	public static checkInputStringValidation(inputString: string): boolean {
		// first and last character cannot be "*"
		inputString = inputString.substr(1, inputString.length - 2);
		for (let char of inputString) {
			if (char === "*") {
				return false;
			}
		}
		return true;
	}

	// Check WHERE End -------------------------
	// Check TRANSFORMATION Start --------------
	private static checkTransformations(transform: any, insightDatasets: InsightDataset[]): boolean {
		if (Object.keys(transform).length === 2) {
			// check "transform" has the right element with right odder
			if (Object.keys(transform)[0] === "GROUP" && Object.keys(transform)[1] === "APPLY") {
				let group = transform.GROUP;
				let apply = transform.APPLY;
				return this.checkGroupValidation(group, insightDatasets)
					&& this.checkApplyValidation(apply, insightDatasets);
			}
		}
		return false;
	}

	private static checkGroupValidation(group: any, datasets: InsightDataset[]): boolean {

		for (let every of group) {
			if (!this.checkKeyValidation(every, datasets)) {
				return false;
			}
			this.columns.add(every);
		}
		return true;
	}

	private static checkApplyValidation(apply: any, datasets: InsightDataset[]): boolean {

		for (let every of apply) {
			if (!this.checkApplyRuleValidation(every, datasets)) {
				return false;
			}
			this.columns.add(Object.keys(every)[0]);
		}
		return true;
	}

	private static checkApplyRuleValidation(applyRule: any, datasets: InsightDataset[]): boolean {
		if ( Object.keys(applyRule).length !== 1) {
			return false;
		}
		let applyKey: any = Object.keys(applyRule)[0];
		let applyToken = Object.values(applyKey)[0];
		return this.checkApplyKey(applyKey) && this.checkToken(applyToken, datasets);
	}

	private static checkApplyKey(applyKey: any): boolean {
		try {
			this.allApplyKeys.add(applyKey);
			return typeof applyKey === "string" && !applyKey.includes("_") && applyKey.length >= 1;
		} catch (err) {
			return false;
		}
	}

	private static checkToken(token: any, datasets: InsightDataset[]): boolean {
		if (Object.keys(token).length !== 1) {
			return false;
		}
		let applyToken: any = Object.keys(token)[0];
		let tokenKey = Object.values(applyToken)[0];
		let OKTokenKey = ["MAX", "MIN", "AVG", "COUNT", "SUM"];
		if (typeof tokenKey !== "string") {
			return false;
		}
		let tokenFiled = tokenKey.split("_")[1];
		let OKTokenFiled = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
		return OKTokenKey.includes(tokenKey) && (OKTokenFiled.includes(tokenFiled) || tokenFiled === "COUNT")
			&& this.checkKeyValidation(tokenKey, datasets);
	}

	// Check TRANSFORMATIONS End -----------------
	// Validation Entry -------------------------
	public static validation(query: any, insightDatasets: InsightDataset[], idSet: any): boolean {
		// Check type validation
		let hasTransformation: boolean = (Object.keys(query).length === 3);
		this.currIDs = idSet;
		// console.log("entered validation" + typeof (query));

		// console.log("247");
		// Check if query has the key "WHERE" and "OPTION", and check the key orders
		if (Object.keys(query).length >= 2 && Object.keys(query)[0] === "WHERE"
			&& Object.keys(query)[1] === "OPTIONS") {
			// Do nothing
		} else {
			return false;
		}
		// console.log("254");
		let where = query.WHERE;
		let options = query.OPTIONS;
		let columns = options.COLUMNS;
		// Check the validation of "WHERE" block
		// console.log("263");
		if (!hasTransformation) {
			return this.checkWhereBlock(where, insightDatasets) && this.checkOption(options, insightDatasets);
		} else {
			return true;
			// let transform = query.TRASNFORMATIONS;
			// for (let column of columns) {
			// 	if (!this.columns.has(columns)) {
			// 		return false;
			// 	}
			// }
			// return this.checkWhereBlock(where, insightDatasets) && this.checkOption(options, insightDatasets)
			// 	&& this.checkTransformations(transform, insightDatasets);
		}
	}

	// Validation End ----------------------------
}

