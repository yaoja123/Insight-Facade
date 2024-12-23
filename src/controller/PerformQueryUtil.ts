export class PerformQueryUtil{
	// reference from stack overflow :https://stackoverflow.com/questions/2784230/how-do-you-sort-an-array-on-multiple-columns
	public static sortByUP (arr: any[], keys: any[], splitKeyChar = "~") {
		return arr.sort((i1,i2) => {
			const sortStr1 = keys.reduce((str, key) => {
				if (typeof i1[key] === "number") {
					return str + splitKeyChar + i1[key].toFixed(2);
				}else{
					return str + splitKeyChar + i1[key];
				}
			}, "");
			const sortStr2 = keys.reduce((str, key) => {
				if (typeof i1[key] === "number") {
					return str + splitKeyChar + i2[key].toFixed(2);
				}else{
					return str + splitKeyChar + i2[key];
				}
			}, "");
			if (sortStr1 < sortStr2) {
				return -1;
			}
			if ( sortStr1 > sortStr2) {
				return 1;
			}
			return 0;
		});
	}

	public static sortByDOWN (arr: any[], keys: any[], splitKeyChar = "~") {
		return arr.sort((i1,i2) => {
			const sortStr1 = keys.reduce((str, key) => {
				if (typeof i1[key] === "number") {
					return str + splitKeyChar + i1[key].toFixed(2);
				}else{
					return str + splitKeyChar + i1[key];
				}
			}, "");
			const sortStr2 = keys.reduce((str, key) => {
				if (typeof i1[key] === "number") {
					return str + splitKeyChar + i2[key].toFixed(2);
				}else{
					return str + splitKeyChar + i2[key];
				}
			}, "");
			if (sortStr1 < sortStr2) {
				return 1;
			}
			if ( sortStr1 > sortStr2) {
				return -1;
			}
			return 0;
		});
	}
}
