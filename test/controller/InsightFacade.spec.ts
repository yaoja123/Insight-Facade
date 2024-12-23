import {
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";
import chaiAsPromised from "chai-as-promised";
import {testFolder} from "@ubccpsc310/folder-test";
import chai, {expect} from "chai";

chai.use(chaiAsPromised);

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: { [key: string]: string } = {
		courses: "./test/resources/archives/courses.zip",
		invalidFile: "./test/resources/archives/coursesInvalidFile.zip",
		invalidDataset: "./test/resources/archives/incorrectFolder.zip",
		single: "./test/resources/archives/Single.zip",
		esmall: "./test/resources/archives/esmall.zip",
		rooms: "./test/resources/archives/rooms.zip",
		table2: "./test/resources/archives/rooms 2.zip"
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run.
		fs.removeSync(persistDir); // TODO: why remove after adding dataset
	});
	describe("Add Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			const content: string = datasetContents.get("courses") ?? "";
		});

		beforeEach(function () {
			this.timeout(20000);
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			this.timeout(200000);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});
		// const content: string = datasetContents.get("courses") ?? "";

		describe("AddDatasets", function () {
			// This is a unit test. You should create more like this!
			it("Should add a valid dataset", function () {
				this.timeout(20000);
				const content: string = datasetContents.get("courses") ?? "";
				const id: string = "courses";
				const expected: string[] = [id];
				return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
					expect(result).to.deep.equal(expected);
				});
			});
			it("BARB should add dataset contains invalid file datasets", function () {
				const id: string = "invalidFile";
				const InContent: string = datasetContents.get("invalidFile") ?? "";
				const expected: string[] = [id];
				return insightFacade.addDataset(id, InContent, InsightDatasetKind.Courses).then((result: string[]) => {
					expect(result).to.deep.equal(expected);
				});
			});
			it("should fulfill with multiple input", function () {
				this.timeout(20000);

				const content: string = datasetContents.get("courses") ?? "";

				return insightFacade.addDataset("course", content, InsightDatasetKind.Courses).then(() => {
					return insightFacade.addDataset("course2", content, InsightDatasetKind.Courses).then((result) => {
						const expectArr = ["course", "course2"];
						expect(result).to.be.instanceof(Array);
						expect(result).to.have.length(2);
						expect(result).have.deep.members(expectArr);
					});
				});
			});
			it("should reject when adding same name dataSet", function () {
				const content: string = datasetContents.get("courses") ?? "";

				return insightFacade.addDataset("course", content, InsightDatasetKind.Courses).then(() => {
					insightFacade.addDataset("course", content, InsightDatasetKind.Courses).then((res) => {
						throw new Error(`result with ${res}`);
					}).catch((err) => {
						expect(err).to.be.instanceof(InsightError);
					});
				});
				// return expect(result).eventually.to.be.rejectedWith(InsightError); // TODO should we reject with insight error?
			});
			it("should fail for white space input,and give insight ERROR", function () {
				const content: string = datasetContents.get("courses") ?? "";

				return insightFacade.addDataset(" ", content, InsightDatasetKind.Courses).catch((err) => {
					expect(err).to.be.instanceof(InsightError);
				});
			});
			it("should fulfill with input contain whitespace.", function () {
				const content: string = datasetContents.get("courses") ?? "";

				return insightFacade.addDataset("cou rse", content, InsightDatasetKind.Courses).then((stuff) => {
					expect(stuff).deep.equal(["cou rse"]);
				});
			});
			it("should fail for underscore input ,and give insight ERROR", function () {
				const content: string = datasetContents.get("courses") ?? "";

				const a = insightFacade.addDataset("_asdf", content, InsightDatasetKind.Courses);
				return expect(a).to.be.eventually.rejectedWith(InsightError);
			});
			it("should reject for multiple underscore input ,and give insight ERROR", function () {
				const content: string = datasetContents.get("courses") ?? "";

				const a = insightFacade.addDataset("_4_0_4_", content, InsightDatasetKind.Courses);
				return expect(a).to.be.eventually.rejectedWith(InsightError);
			});
			it("should reject whitespace_underscore input", function () {
				const content: string = datasetContents.get("courses") ?? "";

				const a = insightFacade.addDataset("_ _", content, InsightDatasetKind.Courses);
				return expect(a).to.be.eventually.rejectedWith(InsightError);
			});
			// it("should reject when data kind is room", function () {
			// 	const content: string = datasetContents.get("courses") ?? "";
			// 	const result = insightFacade.addDataset("course", content, InsightDatasetKind.Rooms);
			// 	return expect(result).to.be.eventually.rejectedWith(InsightError);
			// });
		});
		describe("RemoveDatasets", function () {

			it("should reject with notfound error if input valid that is empty", function () {
				const result = insightFacade.removeDataset("course");
				return expect(result).eventually.rejectedWith(NotFoundError);
			});
			it("should return insight  error when input has under score", function () {
				const result = insightFacade.removeDataset("_404");
				return expect(result).eventually.rejectedWith(InsightError);

			});
			it("should return insight  error when input has under score and space", function () {
				const result = insightFacade.removeDataset("_ _");
				return expect(result).eventually.rejectedWith(InsightError);

			});
			it("CRAIG should remove from an internal model ", function () { // TODO why braxton did not add return in remove dataset in the ved.
				const id = "courses";
				// const content = datasetContents.get(id) ?? "";
				const content: string = datasetContents.get("courses") ?? "";

				return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then(() => {
					return insightFacade.removeDataset(id).then((removeId) => {
						expect(removeId).equal(id); // TODO can I just Equal in here instead od deep
					}).then(() => {
						return insightFacade.listDatasets().then((insightDataSets) =>
							expect(insightDataSets).deep.equal([]));
					});
				});
			});
			it("should return insight  error when input has only whitespace", function () {
				const result = insightFacade.removeDataset(" ");
				return expect(result).eventually.rejectedWith(InsightError);
			});
			it("should reject with notfound error if input valid and not exsit", function () {
				// const id = "courses";
				// const content = datasetContents.get(id) ?? "";
				const content: string = datasetContents.get("courses") ?? "";

				const result = insightFacade.addDataset("course", content, InsightDatasetKind.Courses).then(() => {
					return insightFacade.removeDataset("course404");
				});
				return expect(result).eventually.rejectedWith(NotFoundError);
			});

		});
		describe("listDatasets", function () {
			it("should list no dataset", function () {
				return insightFacade.listDatasets().then((list) => {
					expect(list).deep.equal([]);
				});
			});
			it("title should list data set once", function () {
				// const content: string = datasetContents.get("courses") ?? "";
				const content: string = datasetContents.get("courses") ?? "";
				return insightFacade.addDataset("course", content, InsightDatasetKind.Courses)
					.then(() => insightFacade.listDatasets()
						.then((list) => {
							const [checkList] = list;// TODO what is the "[]" DO
							expect(checkList).have.property("id");
							expect(checkList.id).to.equal("course");
							console.log(checkList.numRows);

						}));
			});
			// check for update			let updateList: any[] = []
			it("should list multiple dataset", function () {

				// const content: string = datasetContents.get("courses") ?? "";
				const content: string = datasetContents.get("courses") ?? "";
				const ad: string = datasetContents.get("invalidFile") ?? "";

				return insightFacade.addDataset("course", content, InsightDatasetKind.Courses).then(() => {
					return insightFacade.addDataset("course-2", content, InsightDatasetKind.Courses).then(() => {
						return insightFacade.listDatasets().then((dataset: InsightDataset[]) => {
							const expectedSet: InsightDataset[] = [{
								id: "course",
								kind: InsightDatasetKind.Courses,
								numRows: 64612,
							}, {
								id: "course-2",
								kind: InsightDatasetKind.Courses,
								numRows: 64612,
							}];
							console.log(dataset);
							expect(dataset).to.be.an.instanceof(Array); // TODO check this keyword
							expect(dataset).have.length(2);
							expect(dataset).to.have.deep.members(expectedSet); // one way to do it Check members and arrylenth
						});
					});
				}
				);
			});
		}).timeout(200000);
	});

	/*
	//extra
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses)
				// insightFacade.addDataset("rooms", datasetContents.get("rooms") ?? "", InsightDatasetKind.Rooms),
			];

			return Promise.all(loadDatasetPromises).catch(() => "lol");
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		testFolder<any, any[], PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnResult(exp: any[], actual: any, input: any) {
					const orderKey = input.OPTIONS.ORDER;
					expect(actual).to.be.instanceof(Array);
					expect(actual).to.be.deep.members(exp);
					expect(actual).to.be.have.length(exp.length);
				},
				assertOnError(expected, actual) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});
});
