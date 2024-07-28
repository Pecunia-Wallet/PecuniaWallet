import gulp from "gulp";
import prefixCss from "gulp-autoprefixer";
import minifyCss from "gulp-uglifycss";
import minifyJs from "gulp-minifier";

const styles = {
    src: "src/main/resources/static/styles/*.css",
    dst: "build/resources/main/static/styles"
};

const scripts = {
    src: "src/main/resources/static/scripts/*.js",
    dst: "build/resources/main/static/scripts"
};

gulp.task("minifyCss", () => {
    return gulp.src(styles.src)
        .pipe(prefixCss())
        .pipe(minifyCss({
            "uglyComments": true
        }))
        .pipe(gulp.dest(styles.dst));
});

gulp.task("minifyJs", () => {
    return gulp.src(scripts.src)
        .pipe(minifyJs({
            minify: true,
            minifyJS: {
                sourceMap: false
            }
        }))
        .pipe(gulp.dest(scripts.dst));
});
